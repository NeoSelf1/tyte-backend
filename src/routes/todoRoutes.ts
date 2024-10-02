import express from 'express'
import OpenAI from 'openai'
import { Tag, Todo } from '../lib/models'
import { connectToDb, convertKoreanDateToYYYYMMDD, getTodayDate } from '../lib/utils'
import { updateDailyStats } from '../lib/dailyStatHelper'
import { authMiddleware, AuthRequest } from '../lib/authMiddleware'
require('dotenv').config()
const todoRouter = express.Router()
todoRouter.use(authMiddleware)
const openai = new OpenAI({ apiKey: process.env.GPT_api_key })

// Todo 생성
todoRouter.post('/', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    console.log('Todo creating')
    const user = req.user
    const { text } = req.body
    const tags = await Tag.find({ user: user._id })
    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: process.env.GPT_message!,
        },
        {
          role: 'user',
          content: `
내용: ${text}
태그 배열: ${tags.map((tag: any) => tag.name)}
`,
        },
      ],
    })

    if (message.choices[0].message.content) {
      console.log('GPT Response:', message.choices[0].message.content)
      var result = JSON.parse(message.choices[0].message.content)
      if (!result.isValid) {
        return res.status(402).json()
      }

      const formattedResult = await Promise.all(
        result.todos?.map(async (_todo: any) => {
          // GPT api 반환값 필드이기에, 모델 스키마와 필드명 상이함 | ex. _todo.tag = "개발"
          const tag: any = await Tag.findOne({ name: _todo.tag, user: user._id })

          const todoData = {
            raw: text,
            title: _todo.title,
            isImportant: _todo.isImportant,
            isLife: _todo.isLife,
            tagId: tag ? tag._id.toString() : null,
            difficulty: _todo.difficulty,
            estimatedTime: _todo.estimatedTime,
            deadline: _todo.isDeadlineRelative ? convertKoreanDateToYYYYMMDD(_todo.deadline) : _todo.deadline,
            isCompleted: false,
            user: user._id,
          }
          const todo = new Todo(todoData)
          await todo.save()

          // 해당 날짜에 대한 균형 지수, 태그들 정보 갱신
          await updateDailyStats(todoData.deadline, user._id)
          const populatedTodo = await todo.populate('tagId')
          return populatedTodo // 확인 필요 -> 굳이 다 보내야함?
        }) ?? [],
      )
      console.log(text, '->', formattedResult)
      res.status(201).json(formattedResult)
    } else {
      return res.status(402).json()
    }
  } catch (error) {
    console.error('Error creating todo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Todo 목록 조회
todoRouter.get('/all/:mode', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { mode } = req.params

    const todos = await Todo.find({ user: req.user._id })
      .populate('tagId')
      .sort(
        mode === 'default'
          ? { deadline: 1, isImportant: -1 }
          : mode === 'important'
          ? { isImportant: -1, createdAt: -1 }
          : { createdAt: -1, isImportant: -1 },
      )
      .lean()
      .exec()

    res.json(todos)
  } catch (error) {
    console.error('Error fetching todos:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

todoRouter.get('/:deadline', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { deadline } = req.params

    const userId = req.user._id

    const todos = await Todo.find({ deadline, user: userId })
      .populate('tagId') // 태그 정보도 함께 가져옴
      // 먼저 중요한 Todo (isImportant: true)를 나열, 그 다음 생성 시간의 역순으로 정렬
      .sort({ isImportant: -1, createdAt: -1 })

    res.json(todos)
  } catch (error) {
    console.error('Error fetching todos for specific date:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

todoRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { id } = req.params
    const _updatedTodo = req.body
    // Swift에서는 전체 Tag 객체의 접근이 필요한 상태였기 때문에, 변경 이후 Tag 객체가 반환된다.
    // Node.js 단에서의 모델 스키마를 준수하기 위해 tagId를 본래 String값으로 재구성해줘야한다.

    const updatedTodoData = { ..._updatedTodo, tagId: _updatedTodo.tagId ? _updatedTodo.tagId._id : null }

    // 기존 Todo 찾기
    const existingTodo = await Todo.findOne({ _id: id, user: req.user._id })
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    // Todo 업데이트
    const updatedTodo = await Todo.findOneAndUpdate({ _id: id, user: req.user._id }, updatedTodoData, { new: true })

    // 날짜가 변경된 경우 양쪽 날짜의 균형지수를 모두 재계산
    if (existingTodo.deadline !== updatedTodo.deadline) {
      // 해당 날짜에 대한 균형 지수, 태그들 정보 갱신
      await updateDailyStats(existingTodo.deadline, req.user._id.toString())
      await updateDailyStats(updatedTodo.deadline, req.user._id.toString())
    } else {
      // 날짜가 변경되지 않은 경우 해당 날짜의 균형지수만 재계산
      await updateDailyStats(updatedTodo.deadline, req.user._id.toString())
    }
    console.log('Todo Editted:', updatedTodo)
    res.json(updatedTodo._id)
  } catch (error) {
    console.error('Error updating todo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

todoRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await connectToDb()
    const { id } = req.params

    const deletedTodo = await Todo.findOneAndDelete({ _id: id, user: req.user._id })

    if (!deletedTodo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    // 삭제된 Todo의 날짜에 대한 일일 균형지수 재계산
    await updateDailyStats(deletedTodo.deadline, req.user._id.toString())

    res.json(deletedTodo._id)
  } catch (error) {
    console.error('Error deleting todo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

todoRouter.patch('/toggle/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    await connectToDb()

    const todo = await Todo.findOne({ _id: id, user: req.user._id })
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    todo.isCompleted = !todo.isCompleted
    await todo.save()
    await updateDailyStats(todo.deadline, req.user._id.toString())
    const populatedTodo = await todo.populate('tagId')
    res.json(populatedTodo)
  } catch (error) {
    console.error('Error toggling todo completion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default todoRouter
