require('dotenv').config()

import express, { Request, Response } from 'express'
import { DailyStat } from '../lib/models'

const dailyStatRouter = express.Router()

dailyStatRouter.get('/', async (req: Request, res: Response) => {
  try {
    // { date: 1 }는 'date' 필드를 기준으로 오름차순 정렬을 의미합니다.
    // '1'은 오름차순(ascending), '-1'은 내림차순(descending)을 나타냅니다.
    const balanceNums = await DailyStat.find().sort({ date: 1 })
    res.json(balanceNums)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})
export default dailyStatRouter
