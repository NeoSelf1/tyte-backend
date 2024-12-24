import express from 'express'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import crypto from 'crypto'
import axios from 'axios'
import { User } from '../lib/models'
import { connectToDb } from '../lib/utils'
import { AuthRequest } from '../lib/authMiddleware'

const authRouter = express.Router()

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
let expirationString = '31d'

authRouter.get('/version', async (req, res) => {
  try {
    console.log('versionCheck called from server')
    return res.status(200).json({ newVersion: '1.2.4', minVersion: '1.2.4' })
  } catch (error) {
    console.error('Token validation error:', error)
    return res.status(500).json()
  }
})

authRouter.post('/validate-token', async (req, res) => {
  try {
    await connectToDb()
    const { token } = req.body

    if (!token) {
      return res.status(400).json()
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string }
      const user = await User.findById(decoded._id)
      if (!user) {
        return res.status(401).json()
      }

      return res.status(200).json({ isValid: true })
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(200).json({ isValid: false })
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json()
      }
      res.status(500).json()
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return res.status(500).json()
  }
})

authRouter.post('/register', async (req, res) => {
  try {
    await connectToDb()
    const { username, email, password } = req.body

    const user = new User({ username, email, password })
    await user.save()
    await user.createDefaultTags()

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!, { expiresIn: expirationString })

    return res.status(200).json({ user, token })
  } catch (error) {
    console.log(error)
    res.status(500).json()
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    await connectToDb()
    const { email, password } = req.body
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(403).json()
    }

    if (!(await user.comparePassword(password))) {
      return res.status(406).json()
    }

    const filteredUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!, { expiresIn: expirationString })
    return res.status(200).json({ user: filteredUser, token })
  } catch (error) {
    res.status(400).send(error)
  }
})

authRouter.post('/check', async (req, res) => {
  try {
    await connectToDb()
    const { email } = req.body

    const existingUser = await User.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      return res.status(200).json({ isValid: true })
    } else {
      return res.status(200).json({ isValid: false })
    }
  } catch (error) {
    console.error('Check username error:', error)
    res.status(500).json()
  }
})

async function handleUser(email: string, name: string) {
  let user = await User.findOne({ email })

  if (!user) {
    user = new User({
      username: name,
      email: email,
      password: crypto.randomBytes(20).toString('hex'),
    })

    await user.save()
    await user.createDefaultTags()
  } else {
    user.username = name
    await user.save()
  }

  const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!, { expiresIn: '31d' })

  return {
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
    },
    token: jwtToken,
  }
}

interface AppleIdTokenPayload {
  iss: string
  aud: string
  exp: number
  iat: number
  sub: string
  c_hash: string
  email: string
  email_verified: string
  auth_time: number
  nonce_supported: boolean
}

async function verifyAppleToken(idToken: string): Promise<AppleIdTokenPayload> {
  try {
    const { kid, alg } = jwt.decode(idToken, { complete: true })?.header as { kid: string; alg: string }

    const appleKeysResponse = await axios.get('https://appleid.apple.com/auth/keys')
    const keys = appleKeysResponse.data.keys
    const key = keys.find((k: any) => k.kid === kid)

    if (!key) {
      throw new Error('Apple public key not found')
    }

    const pubKey = crypto.createPublicKey({
      key: key,
      format: 'jwk',
    })

    const verifiedToken = jwt.verify(idToken, pubKey, { algorithms: [alg as jwt.Algorithm] })

    const payload = verifiedToken as unknown
    if (typeof payload === 'object' && payload !== null && 'sub' in payload && 'email' in payload) {
      return payload as AppleIdTokenPayload
    } else {
      throw new Error('Token payload does not match expected format')
    }
  } catch (error) {
    console.error('Apple token verification failed:', error)
    throw new Error('Invalid Apple ID token')
  }
}

// Apple 로그인 처리 함수
authRouter.post('/apple', async (req, res) => {
  try {
    await connectToDb()
    const { token } = req.body
    if (!token) {
      return res.status(400).json()
    }

    const payload = await verifyAppleToken(token)
    const result = await handleUser(payload.email, payload.sub)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Apple login error:', error)
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json()
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json()
    } else {
      return res.status(500).json()
    }
  }
})

// Google 로그인 처리 함수
authRouter.post('/google', async (req, res) => {
  try {
    await connectToDb()
    const { token } = req.body

    if (!token) {
      return res.status(400).json()
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return res.status(401).send()
    }

    const { email, name } = payload

    if (!email || !name) {
      return res.status(401).json()
    }
    const result = await handleUser(email, name)

    return res.status(200).json(result)
  } catch (error: any) {
    console.error('Google login error:', error)
    if (error.message.includes('Token used too late')) {
      return res.status(401).json()
    } else if (error.message.includes('Invalid token')) {
      return res.status(401).json()
    } else {
      return res.status(500).json()
    }
  }
})

authRouter.delete('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()

    const userId = req.user._id
    await User.findByIdAndDelete(userId)

    return res.status(200).json()
  } catch (error) {
    res.status(500).json()
  }
})

export default authRouter
