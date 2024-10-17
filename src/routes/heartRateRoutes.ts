import express from 'express'
import { connectToDb } from "../lib/utils"
import { HeartRate } from "../lib/models"

const heartRateRouter = express.Router()

heartRateRouter.post('/', async (req, res) => {
  try {
    await connectToDb()
    console.log(req.body)
    const { heartRate } = req.body
    console.log("heartRate:",heartRate)
    const newHeartRate = new HeartRate({ heartRate:heartRate })
    console.log("2")
    await newHeartRate.save() // error here
    console.log("4")
    res.json(newHeartRate._id)
  } catch (error) {
    console.error('Error sending heartRate:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})


export default heartRateRouter
