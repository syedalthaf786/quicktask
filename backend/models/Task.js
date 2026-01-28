const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide a task title'],
        trim: true,
        maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Todo', 'In Progress', 'Completed'],
        default: 'Todo'
    },
    dueDate: {
        type: Date,
        required: [true, 'Please provide a due date']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Virtual field for checking if task is overdue
taskSchema.virtual('isOverdue').get(function () {
    if (this.status === 'Completed') return false;
    return new Date() > this.dueDate;
});

// Virtual field for days until due
taskSchema.virtual('daysUntilDue').get(function () {
    if (this.status === 'Completed') return null;
    const now = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Automatically set completedAt when status changes to Completed
taskSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'Completed' && !this.completedAt) {
        this.completedAt = new Date();
    }

    if (this.isModified('status') && this.status !== 'Completed') {
        this.completedAt = undefined;
    }

    next();
});

// Indexes for faster queries
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, priority: 1 });
taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ user: 1, createdAt: -1 });

// Enable virtuals in JSON
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);
