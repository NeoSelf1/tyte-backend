import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './models'

export interface AuthRequest extends Request {
  user?: any
}

interface JwtPayload {
  _id: string
}

// DB 주소 및 임시 user 객체 생성 여부
export const isDBDevelopment = false

export const isUserDevelopment = false

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    var user = null

    if (isUserDevelopment) {
      user = {
        _id: '66e3f76192082f0bf2b93b13',
        username: 'Test',
        password: '$2b$10$dMzifSoR86OIk4X.fNVoWecsdHRZ5MzFm9PvLehUuaEmmPJ7cOOeC',
        email: 'test@naver.com',
      }
    } else {
      if (!token) {
        throw new Error()
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
      user = await User.findById(decoded._id)

      if (!user) {
        console.log('no user')
        throw new Error()
      }
    }

    req.user = user
    next()
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      // Token has expired
      return res.status(402).json()
    } else if (error instanceof jwt.JsonWebTokenError) {
      // Invalid token
      return res.status(401).json()
    } else {
      // Other errors 
      return res.status(401)
    }
  }
}
