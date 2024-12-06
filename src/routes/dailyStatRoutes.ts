require('dotenv').config()

import express from 'express'
import { DailyStat } from '../lib/models'
import { connectToDb } from '../lib/utils'
import { authMiddleware, AuthRequest } from '../lib/authMiddleware'
import mongoose from 'mongoose'

const dailyStatRouter = express.Router()

dailyStatRouter.use(authMiddleware)

dailyStatRouter.get('/:deadline', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const userId = req.user._id

    const { deadline } = req.params

    const dailyStat = await DailyStat.findOne({
      user: userId,
      date: deadline,
    }).populate({ path: 'tagStats.tagId' })

    return res.status(200).json(dailyStat)
  } catch (error) {
    console.error('Error fetching daily stat:', error)
    res.status(500).json()
  }
})

dailyStatRouter.get('/all/:yearMonth', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const userId = req.user._id
    const { yearMonth } = req.params

    const dailyStats = await DailyStat.find({
      user: userId,
      date: { $regex: `^${yearMonth}` },
    }).populate({ path: 'tagStats.tagId' })

    return res.status(200).json(dailyStats)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

dailyStatRouter.get('/friend/:friendId/:yearMonth', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { friendId, yearMonth } = req.params

    const [year, month] = yearMonth.split('-').map((num) => parseInt(num))

    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]
    const dailyStats = await DailyStat.find({
      user: new mongoose.Types.ObjectId(friendId),
      date: { $gte: startDateStr, $lte: endDateStr },
    }).populate({ path: 'tagStats.tagId' })

    return res.status(200).json(dailyStats)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    res.status(500).json()
  }
})

export default dailyStatRouter
