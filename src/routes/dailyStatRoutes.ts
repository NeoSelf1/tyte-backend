require('dotenv').config()

import express from 'express'
import { DailyStat } from '../lib/models'
import { connectToDb } from '../lib/utils'
import { authMiddleware, AuthRequest } from '../lib/authMiddleware'

const dailyStatRouter = express.Router()
dailyStatRouter.use(authMiddleware)

dailyStatRouter.get('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const userId = req.user._id
    // { date: 1 }는 'date' 필드를 기준으로 오름차순 정렬을 의미합니다.
    // '1'은 오름차순(ascending), '-1'은 내림차순(descending)을 나타냅니다.
    const dailyStats = await DailyStat.find({
      user: userId,
    })
      .sort({ date: 1 })
      .populate({ path: 'tagStats.tagId', select: 'color' })
    res.json(dailyStats)
  } catch (error) {
    console.error('Error fetching daily stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// dailyStatRouter.get('/', async (req: AuthRequest, res) => {
//   try {
//     await connectToDb()
//     const { startDate, endDate } = req.query
//     const userId = req.user._id

//     if (!startDate || !endDate) {
//       return res.status(400).json({ error: 'Start date and end date are required' })
//     }

//     // { date: 1 }는 'date' 필드를 기준으로 오름차순 정렬을 의미합니다.
//     // '1'은 오름차순(ascending), '-1'은 내림차순(descending)을 나타냅니다.

//     const dailyStats = await DailyStat.find({
//       date: { $gte: startDate, $lte: endDate },
//       user: userId,
//     }).sort({ date: 1 })

//     res.json(dailyStats)
//   } catch (error) {
//     console.error('Error fetching daily stats:', error)
//     res.status(500).json({ error: 'Internal server error' })
//   }
// })

export default dailyStatRouter
