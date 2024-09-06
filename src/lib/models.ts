import mongoose from 'mongoose'

//소분류 내용 저장용 스키마 - 항공/육상/해상...
const todoSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  isImportant: { type: Boolean, required: true },
  isLife: { type: Boolean, required: true },
  difficulty: { type: Number, required: true },
  estimatedTime: { type: Number, required: true },
  deadline: { type: String, required: true },
  isCompleted: { type: Boolean, required: true },
})

const balanceNumSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  balanceNum: { type: Number, required: true },
})

export const Todo = mongoose.models?.Todo || mongoose.model('Todo', todoSchema)
export const BalanceNum = mongoose.models?.BalanceNum || mongoose.model('BalanceNum', balanceNumSchema)
