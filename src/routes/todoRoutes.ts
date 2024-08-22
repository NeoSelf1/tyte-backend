import express, { Request, Response } from 'express'
import { Todo } from '../lib/models'
import { connectToDb } from '../lib/utils'

const todoRouter = express.Router()

interface TodoInput {
  content: string
  location?: string
}

// Todo 생성
todoRouter.post('/', async (req: Request<{}, {}, TodoInput>, res: Response) => {
  try {
    await connectToDb()

    const { content, location } = req.body

    const todoData = {
      content,
      date: new Date(),
      location: location || 'Not specified',
    }

    const todo = new Todo(todoData)
    const savedTodo = await todo.save()

    res.status(201).json(savedTodo)
  } catch (error) {
    console.error('Error creating todo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Todo 목록 조회
todoRouter.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDb()
    const todos = await Todo.find()
    res.json(todos)
  } catch (error) {
    console.error('Error fetching todos:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 추가적인 Todo 관련 라우트들 (예: 수정, 삭제 등)을 여기에 정의할 수 있습니다.

export default todoRouter
