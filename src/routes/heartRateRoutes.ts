import express from 'express'
import { connectToDb } from "../lib/utils"
import { HeartRate } from "../lib/models"

const heartRateRouter = express.Router()

heartRateRouter.post('/', async (req, res) => {
  try {
    await connectToDb()
    const { heartRate } = req.body
    console.log("heartRate:",heartRate,"in",Date())
    const newHeartRate = new HeartRate({ heartRate:heartRate })
    await newHeartRate.save()
    res.json(newHeartRate._id)
  } catch (error) {
    console.error('Error sending heartRate:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


export default heartRateRouter
