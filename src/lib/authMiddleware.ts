import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './models'
import mongoose from 'mongoose'

export interface AuthRequest extends Request {
  user?: any
}

interface JwtPayload {
  _id: string
}

export const isDBDevelopment = false
export const isUserDevelopment = false

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    var user = null

    if (isUserDevelopment) {
      user = {
        _id: new mongoose.Types.ObjectId('66e3f76192082f0bf2b93b13'),
        username: 'Test',
        password: '$2b$10$dMzifSoR86OIk4X.fNVoWecsdHRZ5MzFm9PvLehUuaEmmPJ7cOOeC',
        email: 'test@naver.com',
      }
    } else {
      if (!token) {
        console.log('no token')
        throw new Error()
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
      user = await User.findById(decoded._id)
      if (!user) {
        console.log('no user')
        throw new Error()
      }
    }
    // console.log('user:', user)
    req.user = user
    next()
  } catch (error) {
    res.status(401).json()
  }
}
