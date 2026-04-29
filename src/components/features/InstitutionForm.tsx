/**
 * @Project: PG-Tracker
 * @File: InstitutionForm.tsx
 * @Description: 院校表单组件，用于添加和编辑院校信息，包含名称、院系、等级、学位类型、截止日期等字段
 * @Author: 杨敬诚
 * @Date: 2026-04-08
 * Copyright (c) 2026. All rights reserved.
 */
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useStore, Institution } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tier, DegreeType, tierDescriptions, degreeTypeLabels } from '../../lib/constants'
import { parsePolicyTags } from '../../lib/utils'

interface InstitutionFormProps {
  institution?: Institution | null
  onClose: () => void
  onSuccess: (savedInstitution?: Institution) => void
}

export default function InstitutionForm({ institution, onClose, onSuccess }: InstitutionFormProps): JSX.Element {
  const { addInstitution, updateInstitution } = useStore()
  const [formData, setFormData] = useState(() => {
    if (institution) {
      return {
        name: institution.name,
        department: institution.department,
        tier: institution.tier,
        degreeType: institution.degreeType,
        campDeadline: institution.campDeadline || '',
        pushDeadline: institution.pushDeadline || '',
        expectedQuota: institution.expectedQuota != null ? institution.expectedQuota : undefined,
        policyTags: parsePolicyTags(institution.policyTags)
      }
    }
    return {
      name: '',
      department: '',
      tier: 'MATCH' as Tier,
      degreeType: 'MASTER' as DegreeType,
      campDeadline: '',
      pushDeadline: '',
      expectedQuota: undefined as number | undefined,
      policyTags: [] as string[]
    }
  })
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 用户修改表单时清除之前的错误提示
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSubmitError(null) }, [formData.name, formData.department])

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
        expectedQuota: formData.expectedQuota != null ? formData.expectedQuota : null,
        policyTags: formData.policyTags
      }
      const savedInstitution = institution
        ? await updateInstitution(institution.id, data)
        : await addInstitution(data)
      onSuccess(savedInstitution)
    } catch (error: any) {
      const msg = error?.message || '保存失败，请重试'
      setSubmitError(msg)
      console.error('Failed to save institution:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTag = (): void => {
    const tag = tagInput.trim()
    if (tag && !formData.policyTags.includes(tag)) {
      setFormData(prev => ({ ...prev, policyTags: [...prev.policyTags, tag] }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string): void => {
    setFormData(prev => ({ ...prev, policyTags: prev.policyTags.filter(t => t !== tagToRemove) }))
  }

  // 关键修复：overlay onPointerDownOutside 阻止关闭，content onClick 正常穿透
  const handlePointerDownOutside = (e: Event) => {
    e.preventDefault()
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        onPointerDownOutside={handlePointerDownOutside}
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{institution ? '编辑院校' : '添加院校'}</DialogTitle>
          <DialogDescription>填写院校基本信息并保存</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="inst-name">学校名称 *</Label>
              <Input id="inst-name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="如：清华大学" required />
            </div>
            <div className="col-span-2">
              <Label htmlFor="inst-dept">院系名称 *</Label>
              <Input id="inst-dept" value={formData.department} onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))} placeholder="如：计算机科学与技术系" required />
            </div>
            <div>
              <Label htmlFor="inst-tier">申请层次</Label>
              <Select value={formData.tier} onValueChange={(value) => setFormData(prev => ({ ...prev, tier: value as Tier }))}>
                <SelectTrigger id="inst-tier"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REACH">{tierDescriptions.REACH}</SelectItem>
                  <SelectItem value="MATCH">{tierDescriptions.MATCH}</SelectItem>
                  <SelectItem value="SAFETY">{tierDescriptions.SAFETY}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="inst-degree">学位类型</Label>
              <Select value={formData.degreeType} onValueChange={(value) => setFormData(prev => ({ ...prev, degreeType: value as DegreeType }))}>
                <SelectTrigger id="inst-degree"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASTER">{degreeTypeLabels.MASTER}</SelectItem>
                  <SelectItem value="PROFESSIONAL">{degreeTypeLabels.PROFESSIONAL}</SelectItem>
                  <SelectItem value="PHD">{degreeTypeLabels.PHD}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inst-camp">夏令营截止日期</Label>
              <Input id="inst-camp" type="date" value={formData.campDeadline} onChange={(e) => setFormData(prev => ({ ...prev, campDeadline: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="inst-push">预推免截止日期</Label>
              <Input id="inst-push" type="date" value={formData.pushDeadline} onChange={(e) => setFormData(prev => ({ ...prev, pushDeadline: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label htmlFor="inst-quota">预计招生名额</Label>
            <Input id="inst-quota" type="number" min="0" value={formData.expectedQuota ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, expectedQuota: e.target.value !== '' ? parseInt(e.target.value) : undefined }))} placeholder="如：10" />
          </div>

          <div>
            <Label>特殊政策标签</Label>
            <div className="flex gap-2 mt-1.5">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="输入标签后按回车添加" />
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
            {submitError && (
              <p className="text-xs text-destructive w-full text-center mb-1">{submitError}</p>
            )}
            <Button type="button" variant="outline" onClick={onClose}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中...' : institution ? '保存修改' : '添加院校'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
