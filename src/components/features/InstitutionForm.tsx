import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore, Institution } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface InstitutionFormProps {
  institution?: Institution | null
  onClose: () => void
  onSuccess: () => void
}

const initialFormData = {
  name: '',
  department: '',
  tier: 'MATCH' as 'REACH' | 'MATCH' | 'SAFETY',
  degreeType: 'MASTER' as 'MASTER' | 'PHD',
  campDeadline: '',
  pushDeadline: '',
  expectedQuota: undefined as number | undefined,
  policyTags: [] as string[]
}

export default function InstitutionForm({ institution, onClose, onSuccess }: InstitutionFormProps): JSX.Element {
  const { addInstitution, updateInstitution } = useStore()
  const [formData, setFormData] = useState({
    ...initialFormData,
    ...(institution
      ? {
          name: institution.name,
          department: institution.department,
          tier: institution.tier,
          degreeType: institution.degreeType,
          campDeadline: institution.campDeadline || '',
          pushDeadline: institution.pushDeadline || '',
          expectedQuota: institution.expectedQuota || undefined,
          policyTags: institution.policyTags ? JSON.parse(institution.policyTags) : []
        }
      : initialFormData)
  })
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.department.trim()) return
    setIsSubmitting(true)
    try {
      const data = {
        name: formData.name.trim(),
        department: formData.department.trim(),
        tier: formData.tier,
        degreeType: formData.degreeType,
        campDeadline: formData.campDeadline || null,
        pushDeadline: formData.pushDeadline || null,
        expectedQuota: formData.expectedQuota || null,
        policyTags: formData.policyTags
      }
      if (institution) {
        await updateInstitution(institution.id, data)
      } else {
        await addInstitution(data)
      }
      onSuccess()
    } catch (error) {
      console.error('Failed to save institution:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTag = (): void => {
    const tag = tagInput.trim()
    if (tag && !formData.policyTags.includes(tag)) {
      setFormData((prev) => ({ ...prev, policyTags: [...prev.policyTags, tag] }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string): void => {
    setFormData((prev) => ({ ...prev, policyTags: prev.policyTags.filter((t) => t !== tagToRemove) }))
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{institution ? '编辑院校' : '添加院校'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">学校名称 *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} placeholder="如：清华大学" required />
            </div>
            <div className="col-span-2">
              <Label htmlFor="department">院系名称 *</Label>
              <Input id="department" value={formData.department} onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))} placeholder="如：计算机科学与技术系" required />
            </div>
            <div>
              <Label>申请层次</Label>
              <Select value={formData.tier} onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value as 'REACH' | 'MATCH' | 'SAFETY' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REACH">冲 - 超出自身水平</SelectItem>
                  <SelectItem value="MATCH">稳 - 匹配自身水平</SelectItem>
                  <SelectItem value="SAFETY">保 - 保底选择</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>学位类型</Label>
              <Select value={formData.degreeType} onValueChange={(value) => setFormData((prev) => ({ ...prev, degreeType: value as 'MASTER' | 'PHD' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASTER">学硕</SelectItem>
                  <SelectItem value="PHD">直博</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campDeadline">夏令营截止日期</Label>
              <Input id="campDeadline" type="date" value={formData.campDeadline} onChange={(e) => setFormData((prev) => ({ ...prev, campDeadline: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="pushDeadline">预推免截止日期</Label>
              <Input id="pushDeadline" type="date" value={formData.pushDeadline} onChange={(e) => setFormData((prev) => ({ ...prev, pushDeadline: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label htmlFor="expectedQuota">预计招生名额</Label>
            <Input id="expectedQuota" type="number" min="0" value={formData.expectedQuota || ''} onChange={(e) => setFormData((prev) => ({ ...prev, expectedQuota: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="如：10" />
          </div>

          <div>
            <Label>特殊政策标签</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="输入标签后按回车添加" />
              <Button type="button" variant="secondary" onClick={addTag}>添加</Button>
            </div>
            {formData.policyTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.policyTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary rounded text-sm">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">常用标签：面试绿卡、提供食宿、强基计划、转博机会</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中...' : institution ? '保存修改' : '添加院校'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
