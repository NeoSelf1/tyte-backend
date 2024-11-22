import express from 'express'
import { DailyStat, Tag, Todo } from '../lib/models'
import { connectToDb } from '../lib/utils'
import { authMiddleware, AuthRequest } from '../lib/authMiddleware'

const tagRouter = express.Router()

tagRouter.use(authMiddleware)

tagRouter.post('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { name, color } = req.body
    const newTag = new Tag({ name, color, user: req.user._id })
    await newTag.save()

    return res.status(200).json({ id: newTag._id })
  } catch (error) {
    console.error('Error creating tag:', error)
    res.status(500).json()
  }
})

tagRouter.get('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const tags = await Tag.find({ user: req.user._id })

    console.log("get Tags",new Date())
    return res.status(200).json(tags)
  } catch (error) {
    console.error('Error fetching tags:', error)
    res.status(500).json()
  }
})

tagRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { id } = req.params
    const { name, color } = req.body
    const updatedTag = await Tag.findOneAndUpdate({ _id: id, user: req.user._id }, { name, color }, { new: true })
    if (!updatedTag) {
      return res.status(403).json()
    }

    return res.status(200).json({ id : updatedTag._id })
  } catch (error) {
    console.error('Error updating tag:', error)
    res.status(500).json()
  }
})

tagRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { id } = req.params
    const deletedTag = await Tag.findOneAndDelete({ _id: id, user: req.user._id })
    if (!deletedTag) {
      return res.status(403).json()
    }
    // api 호출한 유저에 대한 DailyStat 모델들 모두 호출 -> tagStats 배열에서 삭제된 태그 ID를 지닌 요소 {tagID, count} 제거
    await DailyStat.updateMany({ user: req.user._id }, { $pull: { tagStats: { tagId: id } } })

    // $pull = 특정 조건에 맞는 요소 제거하는데에 사용.
    await Todo.updateMany({ tagId: id, user: req.user._id }, { $set: { tagId: null } })

    return res.status(200).json({ id: deletedTag._id })
  } catch (error) {
    console.error('Error deleting tag:', error)
    res.status(500).json()
  }
})

export default tagRouter
