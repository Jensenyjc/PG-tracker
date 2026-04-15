/**
 * @Project: PG-Tracker
 * @File: AdvisorForm.tsx
 * @Description: 导师表单组件，用于添加和编辑导师信息，包含姓名、职称、研究方向、邮箱、联系状态等
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { useState } from 'react'
import { useStore, Advisor } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'

interface AdvisorFormProps {
  institutionId: string
  advisor?: Advisor | null
  onClose: () => void
}

const statusOptions = [
  { value: 'PENDING', label: '未联系' },
  { value: 'SENT', label: '已发送' },
  { value: 'REPLIED', label: '已回复' },
  { value: 'INTERVIEW', label: '面试中' },
  { value: 'REJECTED', label: '已拒绝' },
  { value: 'ACCEPTED', label: '已接受' }
]

export default function AdvisorForm({ institutionId, advisor, onClose }: AdvisorFormProps): JSX.Element {
  const { addAdvisor, updateAdvisor } = useStore()
  const [formData, setFormData] = useState({
    name: advisor?.name || '',
    title: advisor?.title || '',
    researchArea: advisor?.researchArea || '',
    email: advisor?.email || '',
    homepage: advisor?.homepage || '',
    contactStatus: advisor?.contactStatus || 'PENDING',
    reputationScore: advisor?.reputationScore || undefined,
    notes: advisor?.notes || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.researchArea.trim() || !formData.email.trim()) return
    setIsSubmitting(true)
    try {
      const data = {
        institutionId,
        name: formData.name.trim(),
        title: formData.title.trim() || null,
        researchArea: formData.researchArea.trim(),
        email: formData.email.trim(),
        homepage: formData.homepage.trim() || null,
        contactStatus: formData.contactStatus as any,
        reputationScore: formData.reputationScore || null,
        notes: formData.notes.trim() || null
      }
      if (advisor) await updateAdvisor(advisor.id, data)
      else await addAdvisor(data)
      onClose()
    } catch (error) {
      console.error('Failed to save advisor:', error)
      alert('保存失败：' + (error as Error).message)
    }
    finally { setIsSubmitting(false) }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{advisor ? '编辑导师' : '添加导师'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">姓名 *</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="如：张教授" required />
          </div>
          <div>
            <Label htmlFor="title">职称</Label>
            <Input id="title" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} placeholder="如：教授、副教授、助理教授" />
          </div>
          <div>
            <Label htmlFor="researchArea">研究方向 *</Label>
            <Input id="researchArea" value={formData.researchArea} onChange={(e) => setFormData((prev) => ({ ...prev, researchArea: e.target.value }))} placeholder="如：机器学习、计算机视觉" required />
          </div>
          <div>
            <Label htmlFor="email">邮箱 *</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} placeholder="如：zhang@university.edu.cn" required />
          </div>
          <div>
            <Label htmlFor="homepage">个人主页</Label>
            <Input id="homepage" type="text" value={formData.homepage} onChange={(e) => setFormData((prev) => ({ ...prev, homepage: e.target.value }))} placeholder="如：https://www.university.edu.cn/~zhang" />
          </div>
          <div>
            <Label>联系状态</Label>
            <Select value={formData.contactStatus} onValueChange={(value) => setFormData((prev) => ({ ...prev, contactStatus: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="reputationScore">评分 (1-5)</Label>
            <Input id="reputationScore" type="number" min="1" max="5" value={formData.reputationScore || ''} onChange={(e) => setFormData((prev) => ({ ...prev, reputationScore: e.target.value ? parseInt(e.target.value) : undefined }))} />
          </div>
          <div>
            <Label htmlFor="notes">备注</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} placeholder="导师评价、实验室情况、注意事项等..." rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中...' : advisor ? '保存修改' : '添加导师'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
