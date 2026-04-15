/**
 * @Project: PG-Tracker
 * @File: TaskForm.tsx
 * @Description: 任务表单组件，用于添加和编辑待办任务，包含任务标题和截止日期
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { useState } from 'react'
import { format } from 'date-fns'
import { useStore, Task } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'

interface TaskFormProps {
  institutionId: string
  task?: Task | null
  onClose: () => void
}

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') {
    // 已经是 ISO 字符串如 "2025-06-15" 或 "2025-06-15T00:00:00.000Z"
    return value.substring(0, 10)
  }
  // Date 对象
  return format(new Date(value), 'yyyy-MM-dd')
}

export default function TaskForm({ institutionId, task, onClose }: TaskFormProps): JSX.Element {
  const { addTask, updateTask } = useStore()
  const [formData, setFormData] = useState({
    title: task?.title || '',
    dueDate: toDateInputValue(task?.dueDate)
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.dueDate) return
    setIsSubmitting(true)
    try {
      const data = { institutionId, title: formData.title.trim(), dueDate: formData.dueDate, isCompleted: task?.isCompleted || false }
      if (task) await updateTask(task.id, data)
      else await addTask(data)
      onClose()
    } catch (error) {
      console.error('Failed to save task:', error)
      alert('保存失败：' + (error as Error).message)
    }
    finally { setIsSubmitting(false) }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>{task ? '编辑任务' : '添加任务'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">任务名称 *</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} placeholder="如：准备个人陈述" required />
          </div>
          <div>
            <Label htmlFor="dueDate">截止日期 *</Label>
            <Input id="dueDate" type="date" value={formData.dueDate} onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中...' : task ? '保存修改' : '添加任务'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
