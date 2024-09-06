import express, { Request, Response } from 'express'
import OpenAI from 'openai'
import { Todo } from '../lib/models'
import { connectToDb, getTodayDate, TodoCreateMessage } from '../lib/utils'
import { v4 } from 'uuid'
import { updateBalanceNumByDate } from '../lib/balanceFunc'

require('dotenv').config()
const todoRouter = express.Router()

const openai = new OpenAI({ apiKey: process.env.GPT_api_key })

interface TodoInput {
  text: string
}

interface RawTodo {
  title: string
  isImportant: boolean
  isLife: boolean
  difficulty: number
  estimatedTime: number
  deadline: string
}

interface GptResponse {
  isValid: boolean
  todos?: [RawTodo]
}

// Todo 생성
todoRouter.post('/', async (req: Request<{}, {}, TodoInput>, res: Response) => {
  try {
    await connectToDb()
    const { text } = req.body
    const message = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: TodoCreateMessage,
        },
        {
          role: 'user',
          content: `
Date: ${getTodayDate()}
Content: ${text}
`,
        },
      ],
    })

    if (message.choices[0].message.content) {
      var result: GptResponse = JSON.parse(message.choices[0].message.content)
      if (!result.isValid) {
        console.log('GPTResponse is not valid')
        res.status(206).json({ error: 'GPTResponse is not valid' })
        return
      }

      const formattedResult = await Promise.all(
        result.todos?.map(async (_todo: RawTodo) => {
          const newId = v4()
          const todoWithId = { id: newId, isCompleted: false, ..._todo }
          const todo = new Todo(todoWithId)
          await todo.save()

          // 해당 날짜에 대한 균형 지수 업데이트
          await updateBalanceNumByDate(_todo.deadline)
          return todoWithId
        }) ?? [],
      )

      console.log(text, '->', formattedResult)
      res.status(201).json(formattedResult)

      return true
    } else {
      console.log('AI가 Todo를 분석하는 것을 실패했어요')
      res.status(204).json({ error: 'AI가 Todo를 분석하는 것을 실패했어요' })
    }
  } catch (error) {
    console.error('Error creating todo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Todo 목록 조회
todoRouter.get('/', async (req: Request, res: Response) => {
  try {
    await connectToDb()
    const currentDate = new Date()
    // lean() = 순수 Javascript 객체 반환, exec() 쿼리 실행 및 프로미스 반환
    const todos = await Todo.find({ isCompleted: false }).lean().exec()

    const sortedTodos = todos.sort((a, b) => {
      const deadlineA = new Date(a.deadline)
      const deadlineB = new Date(b.deadline)
      const diffA = deadlineA.getTime() - currentDate.getTime()
      const diffB = deadlineB.getTime() - currentDate.getTime()
      return diffA - diffB
    })

    res.json(sortedTodos)
  } catch (error) {
    console.error('Error fetching todos:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 특정 날짜에 대한 Todo 목록 조회
todoRouter.get('/:deadline', async (req: Request, res: Response) => {
  try {
    await connectToDb()
    const { deadline } = req.params

    const todos = await Todo.find({ deadline })

    res.json(todos)
  } catch (error) {
    console.error('Error fetching todos:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

todoRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDb()
    const { id } = req.params

    const deletedTodo = await Todo.findOneAndDelete({ id })

    if (!deletedTodo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    // 삭제된 Todo의 날짜에 대한 일일 균형지수 재계산
    await updateBalanceNumByDate(deletedTodo.deadline)

    res.json(deletedTodo)
  } catch (error) {
    console.error('Error deleting todo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

todoRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    await connectToDb()
    const { id } = req.params
    const updatedTodoData = req.body

    // 기존 Todo 찾기
    const existingTodo = await Todo.findOne({ id })
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    // Todo 업데이트
    const updatedTodo = await Todo.findOneAndUpdate({ id }, updatedTodoData, { new: true })

    // 날짜가 변경된 경우 양쪽 날짜의 균형지수를 모두 재계산
    if (existingTodo.deadline !== updatedTodo.deadline) {
      await updateBalanceNumByDate(existingTodo.deadline)
      await updateBalanceNumByDate(updatedTodo.deadline)
    } else {
      // 날짜가 변경되지 않은 경우 해당 날짜의 균형지수만 재계산
      await updateBalanceNumByDate(updatedTodo.deadline)
    }

    res.json(updatedTodo)
  } catch (error) {
    console.error('Error updating todo:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

todoRouter.patch('/toggle/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await connectToDb()

    const todo = await Todo.findOne({ id })
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    todo.isCompleted = !todo.isCompleted
    await todo.save()

    res.json(todo)
  } catch (error) {
    console.error('Error toggling todo completion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default todoRouter
