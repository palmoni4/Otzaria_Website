import mongoose from 'mongoose';

const BookSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, index: true },
  totalPages: { type: Number, default: 0 },
  // שדה חדש לשיפור ביצועים
  completedPages: { type: Number, default: 0 }, 
  category: { type: String },
  author: { type: String },
  description: { type: String },
  editingInfo: { type: Object }, 
}, { timestamps: true });

// אינדקסים לביצועים
BookSchema.index({ category: 1 });
BookSchema.index({ name: 'text', description: 'text' }); // לחיפוש מהיר

export default mongoose.models.Book || mongoose.model('Book', BookSchema);