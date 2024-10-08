import express from 'express'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import crypto from 'crypto'
import axios from 'axios'
import { User } from '../lib/models'
import { connectToDb, isValidEmail, isValidPassword, isValidUsername } from '../lib/utils'

const authRouter = express.Router()

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// 앱 처음 진입 시, 이전에 로그인한 이력이 있을 때, 검증위한 함수
authRouter.post('/validate-token', async (req, res) => {
  try {
    await connectToDb()
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required', code: 'TOKEN_REQUIRED' })
    }

    try {
      // JWT 토큰 검증
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string }
      
      // 사용자 존재 여부 확인
      const user = await User.findById(decoded._id)

      if (!user) {
        return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' })
      }

      // 토큰이 유효하고 사용자가 존재하면 성공 응답
      res.status(200).json({ 
        isValid: true})
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(402).json()
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json()
      } else {
        throw error
      }
    }
  } catch (error) {
    res.status(500).json()
  }
})

authRouter.post('/register', async (req, res) => {
  try {
    await connectToDb()
    const { username, email, password } = req.body

    // 이메일 유효성 검사
    if (!isValidEmail(email)) {
      return res.status(422).send({ error: 'Invalid email format' })
    }

    // 사용자 이름 유효성 검사 = 3-20자, 영문, 숫자, 언더스코어만 허용
    if (!isValidUsername(username)) {
      return res.status(423).send({ error: 'Invalid username' })
    }

    // 사용자 이름 유효성 검사 = 3-20자, 영문, 숫자, 언더스코어만 허용
    if (!isValidPassword(password)) {
      return res.status(424).send({ error: 'Invalid password' })
    }

    // 이메일 중복 검사
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).send({ error: 'Email already exists' })
    }
    const user = new User({ username, email, password })
    await user.save()
    await user.createDefaultTags()

    console.log('회원가입 성공')
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!)
    res.status(201).send({ user, token })
  } catch (error) {
    console.log(error)
    res.status(400).send(error)
  }
})

authRouter.post('/login', async (req, res) => {
  try {
    await connectToDb()
    const { email, password } = req.body
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(425).send({ error: 'User not found' })
    }

    if (!(await user.comparePassword(password))) {
      return res.status(411).send({ error: 'Wrong password' })
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!)

    const filteredUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
    }

    console.log('로그인:', user.username)
    res.send({ user: filteredUser, token })
  } catch (error) {
    console.log('here')
    res.status(400).send(error)
  }
})

authRouter.post('/check', async (req, res) => {
  try {
    await connectToDb()
    const { email } = req.body

    if (!email || email.trim().length === 0) {
      res.status(400).json({ error: 'Email is required' })
      return
    }
    // Check if the username already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })

    if (existingUser) {
      // 기존 Email 존재
      res.status(200).json({ isValid: true })
      return
    } else {
      res.status(220).json({ isValid: false })
    }
  } catch (error) {
    console.error('Check username error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

async function handleUser(email: string, name: string) {
  let user = await User.findOne({ email })

  if (!user) {
    user = new User({
      username: name,
      email: email,
      password: crypto.randomBytes(20).toString('hex'), // 랜덤 비밀번호 생성
    })

    await user.save()
    await user.createDefaultTags()
  } else {
    user.username = name
    await user.save()
  }

  const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' })

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
    const { identityToken } = req.body
    if (!identityToken) {
      return res.status(400).json({ error: 'Identity token and Authorization Code is required' })
    }

    const payload = await verifyAppleToken(identityToken)
    const result = await handleUser(payload.email, payload.sub)

    res.status(200).json(result)
  } catch (error: any) {
    console.error('Apple login error:', error)
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Invalid token' })
    } else if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// Google 로그인 처리 함수
authRouter.post('/google', async (req, res) => {
  try {
    await connectToDb()
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: 'Token is required' })
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload) {
      return res.status(401).send({ error: 'Invalid token' })
    }

    const { email, name } = payload

    if (!email || !name) {
      return res.status(401).json({ error: '구글로그인 에러' })
    }

    const result = await handleUser(email, name)

    res.status(200).json(result)
  } catch (error: any) {
    console.error('Google login error:', error)
    if (error.message.includes('Token used too late')) {
      res.status(401).send({ error: 'Token expired. Please try again.' })
    } else if (error.message.includes('Invalid token')) {
      res.status(401).send({ error: 'Invalid token. Please try again.' })
    } else {
      res.status(500).send({ error: 'Internal server error' })
    }
  }
})

authRouter.delete('/:email', async (req, res) => {
  try {
    await connectToDb()

    const { email } = req.params

    // 이메일로 사용자 찾기
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return res.status(404).json()
    }
    console.log(email, '유저 삭제됨')
    // 사용자 삭제
    await User.findByIdAndDelete(user._id)

    res.json(user._id)
  } catch (error) {
    res.status(400).send(error)
  }
})

export default authRouter
