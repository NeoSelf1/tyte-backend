import express from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../lib/models'
import { connectToDb } from '../lib/utils'

const authRouter = express.Router()

authRouter.post('/register', async (req, res) => {
  try {
    console.log('/register')
    await connectToDb()
    const { username, email, password } = req.body
    const user = new User({ username, email, password })
    await user.save()

    await user.createDefaultTags()

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
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid login credentials')
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!)
    res.send({ user, token })
  } catch (error) {
    res.status(400).send(error)
  }
})

export default authRouter
