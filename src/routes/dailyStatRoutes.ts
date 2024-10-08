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
      .populate({ path: 'tagStats.tagId' })

    res.json(dailyStats)
  } catch (error) {
    console.error('Error fetching daily stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

dailyStatRouter.get('/:range', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const userId = req.user._id
    const { range } = req.params
    const [startTime, endTime] = range.split(',')

    const [startYear, startMonth, startDay] = startTime.split('-')
    const [endYear, endMonth, endDay] = endTime.split('-')

    const startDate = `${startYear}-${startMonth}-01`
    const endDate = `${endYear}-${endMonth}-${endDay}` // This will work for all months, as MongoDB will automatically handle the correct last day

    const dailyStats = await DailyStat.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .populate({ path: 'tagStats.tagId' })
    console.log(dailyStats)

    res.json(dailyStats)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default dailyStatRouter
