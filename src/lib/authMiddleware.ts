import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from './models'

export interface AuthRequest extends Request {
  user?: any
}

interface JwtPayload {
  _id: string
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      throw new Error()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    const user = await User.findById(decoded._id)

    if (!user) {
      console.log('no user')
      throw new Error()
    }

    // Debug 용으로 명시한 임시 사용자 객체. 디버그 완료 시 위 주석으로 대체
    // let user = {
    //   _id: '66dea7d2df1974ec7353476b',
    //   username: '1',
    //   password: '$2b$10$FfTos2OJ5lAa7rlZ3eL2W.Ms9hJbZ2iNW6OWnsY2yyPSBT8Sfu3Hm',
    //   email: '1',
    // }

    req.user = user
    next()
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' })
  }
}
