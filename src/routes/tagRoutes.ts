import express from 'express'
import { Tag, Todo } from '../lib/models'
import { connectToDb } from '../lib/utils'
import { authMiddleware, AuthRequest } from '../lib/authMiddleware'

const tagRouter = express.Router()

tagRouter.use(authMiddleware)

tagRouter.post('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    // color는 # 제외한 6자리 코드
    const { name, color } = req.body
    const newTag = new Tag({ name, color, user: req.user._id })
    await newTag.save()
    res.status(201).json(newTag)
  } catch (error) {
    console.error('Error creating tag:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

tagRouter.get('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const tags = await Tag.find({ user: req.user._id })
    res.json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

tagRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { id } = req.params
    const { name, color } = req.body
    const updatedTag = await Tag.findOneAndUpdate({ _id: id, user: req.user._id }, { name, color }, { new: true })
    if (!updatedTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    res.json(updatedTag)
  } catch (error) {
    console.error('Error updating tag:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

tagRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { id } = req.params
    const deletedTag = await Tag.findOneAndDelete({ _id: id, user: req.user._id })
    if (!deletedTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    // $pull = 특정 조건에 맞는 요소 제거하는데에 사용.
    await Todo.updateMany({ tagId: id, user: req.user._id }, { $pull: { tagId: id } })

    res.json(deletedTag)
  } catch (error) {
    console.error('Error deleting tag:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default tagRouter
