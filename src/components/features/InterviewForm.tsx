import { useState } from 'react'
import { useStore } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'

interface InterviewFormProps {
  advisorId: string
  onClose: () => void
}

export default function InterviewForm({ advisorId, onClose }: InterviewFormProps): JSX.Element {
  const { addInterview } = useStore()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    format: 'ONLINE',
    markdownNotes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.date) return
    setIsSubmitting(true)
    try {
      await addInterview({ advisorId, date: formData.date, format: formData.format, markdownNotes: formData.markdownNotes })
      onClose()
    } catch (error) {
      console.error('Failed to save interview:', error)
      alert('保存失败：' + (error as Error).message)
    }
    finally { setIsSubmitting(false) }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>记录面经</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">面试日期 *</Label>
            <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))} required />
          </div>
          <div>
            <Label>面试形式</Label>
            <Select value={formData.format} onValueChange={(value) => setFormData((prev) => ({ ...prev, format: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">线上</SelectItem>
                <SelectItem value="OFFLINE">线下</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="markdownNotes">面经记录 (Markdown)</Label>
            <Textarea id="markdownNotes" value={formData.markdownNotes} onChange={(e) => setFormData((prev) => ({ ...prev, markdownNotes: e.target.value }))} placeholder={`## 面试问题记录\n\n### 专业问题\n- 问题1\n- 问题2\n\n### 算法题\n\`\`\`\n代码\n\`\`\`\n\n### 英语问答\n- Q: ...\n- A: ...\n\n### 总结\n...`} rows={12} className="font-mono text-sm" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中...' : '保存记录'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
