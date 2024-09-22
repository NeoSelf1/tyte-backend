import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, required: true }, // Hex color code
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
})

const todoSchema = new mongoose.Schema(
  {
    raw: { type: String, required: true },
    title: { type: String, required: true },
    isImportant: { type: Boolean, required: true },
    tagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag' },
    isLife: { type: Boolean, required: true },
    difficulty: { type: Number, required: true },
    estimatedTime: { type: Number, required: true },
    deadline: { type: String, required: true },
    isCompleted: { type: Boolean, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
})

const dailyStatSchema = new mongoose.Schema({
  date: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balanceData: {
    title: { type: String, required: true },
    message: { type: String, required: true },
    balanceNum: { type: Number, required: true },
  },
  productivityNum: { type: Number, required: true },
  tagStats: [
    {
      tagId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tag' },
      count: { type: Number, default: 0 },
    },
  ],
  center: { type: [Number], required: true },
})

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

userSchema.methods.createDefaultTags = async function () {
  const defaultTags = [
    { name: '일', color: '7B68EE' },
    { name: '자유시간', color: 'F0E68C' },
  ]

  for (const tagData of defaultTags) {
    const newTag = new Tag({
      name: tagData.name,
      color: tagData.color,
      user: this._id,
    })
    await newTag.save()
  }
}

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password)
}

dailyStatSchema.index({ date: 1, user: 1 }, { unique: true })

export const Todo = mongoose.models?.Todo || mongoose.model('Todo', todoSchema)
export const Tag = mongoose.models?.Tag || mongoose.model('Tag', tagSchema)
export const User = mongoose.models?.User || mongoose.model('User', userSchema)
export const DailyStat = mongoose.models?.DailyStat || mongoose.model('DailyStat', dailyStatSchema)
