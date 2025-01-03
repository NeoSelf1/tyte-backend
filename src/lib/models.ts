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
  { timestamps: true, toJSON: { getters: true } },
)

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
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

const friendSchema = new mongoose.Schema(
  {
    user1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
)

const friendRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true },
)

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

userSchema.methods.createDefaultTags = async function () {
  const defaultTags = [
    { name: '학습', color: 'FF0000' },
    { name: '여가', color: 'F0E68C' },
    { name: '건강', color: '00FFFF' },
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

const heartRateSchema = new mongoose.Schema(
  {
    heartRate: { type: Number, required: true },
    index: { type: Number, required: true },
    time: { type: String, required: true },
  },
  { timestamps: true },
)

dailyStatSchema.index({ date: 1, user: 1 }, { unique: true })

export const Todo = mongoose.models?.Todo || mongoose.model('Todo', todoSchema)
export const Tag = mongoose.models?.Tag || mongoose.model('Tag', tagSchema)
export const User = mongoose.models?.User || mongoose.model('User', userSchema)
export const DailyStat = mongoose.models?.DailyStat || mongoose.model('DailyStat', dailyStatSchema)
export const Friend = mongoose.models?.Friend || mongoose.model('Friend', friendSchema)
export const FriendRequest = mongoose.models?.FriendRequest || mongoose.model('FriendRequest', friendRequestSchema)

export const HeartRate = mongoose.models?.HeartRate || mongoose.model('HeartRate', heartRateSchema)
