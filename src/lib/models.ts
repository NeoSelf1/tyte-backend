import mongoose from 'mongoose'

//소분류 내용 저장용 스키마 - 항공/육상/해상...
const todoSchema = new mongoose.Schema({
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  location: { type: String },
})

export const Todo = mongoose.models?.Todo || mongoose.model('Todo', todoSchema)
