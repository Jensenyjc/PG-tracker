import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Copy, Check, Mail, Edit2, Plus, Trash2, Save, X, Eye } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { useStore } from '../../stores/appStore'

const VARIABLE_POOL = [
  'ADVISOR_NAME', 'YOUR_NAME', 'YOUR_UNIVERSITY', 'YOUR_MAJOR',
  'YOUR_GPA', 'YOUR_RANK', 'RESEARCH_INTEREST',
  'YOUR_PROJECTS', 'YOUR_CONTACT', 'ACHIEVEMENTS'
]

const defaultTemplates = [
  {
    id: 'self-intro', name: '自荐信',
    subject: '保研自荐 - {{YOUR_NAME}}',
    content: `尊敬的{{ADVISOR_NAME}}老师：

您好！我是{{YOUR_NAME}}，来自{{YOUR_UNIVERSITY}}{{YOUR_MAJOR}}专业，目前 GPA {{YOUR_GPA}}，专业排名 {{YOUR_RANK}}。

我对您的研究方向{{RESEARCH_INTEREST}}非常感兴趣。在本科阶段，我参与了{{YOUR_PROJECTS}}，积累了一定的研究经验。

附件是我的个人简历和成绩单，恳请老师能给我一个机会，期待能够加入您的课题组继续深造。

此致
敬礼

{{YOUR_NAME}}
{{YOUR_CONTACT}}`,
    variables: ['ADVISOR_NAME', 'YOUR_NAME', 'YOUR_UNIVERSITY', 'YOUR_MAJOR', 'YOUR_GPA', 'YOUR_RANK', 'YOUR_PROJECTS', 'YOUR_CONTACT']
  },
  {
    id: 'inquiry', name: '询问名额',
    subject: '关于{{ADVISOR_NAME}}老师课题组的咨询',
    content: `尊敬的{{ADVISOR_NAME}}老师：

您好！我是{{YOUR_NAME}}，来自{{YOUR_UNIVERSITY}}{{YOUR_MAJOR}}专业。

我在官网上了解到您的研究方向是{{RESEARCH_INTEREST}}，对此非常感兴趣。我目前已经获得了{{ACHIEVEMENTS}}，希望能够有机会加入您的课题组。

请问老师今年还有博士/硕士研究生招生名额吗？

期待您的回复！

{{YOUR_NAME}}
{{YOUR_CONTACT}}`,
    variables: ['ADVISOR_NAME', 'YOUR_NAME', 'YOUR_UNIVERSITY', 'YOUR_MAJOR', 'RESEARCH_INTEREST', 'ACHIEVEMENTS', 'YOUR_CONTACT']
  },
  {
    id: 'thank-you', name: '感谢信',
    subject: '感谢您今天的面试 - {{YOUR_NAME}}',
    content: `尊敬的{{ADVISOR_NAME}}老师：

您好！感谢您在百忙之中抽出时间与我进行面试。通过今天的交流，我更加深入地了解了您课题组的研究方向{{RESEARCH_INTEREST}}，对能够加入您的团队更加向往。

我会继续努力提升自己，期待能够收到您的好消息！

此致
敬礼

{{YOUR_NAME}}`,
    variables: ['ADVISOR_NAME', 'YOUR_NAME', 'RESEARCH_INTEREST']
  }
]

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{\s*(.+?)\s*\}\}/g) || []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))]
}

// 预览渲染函数，支持 fillValues：已填值渲染为绿色，未填值渲染为蓝色占位符
function renderPreviewText(text: string, fillValues: Record<string, string>): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/\{\{\s*(.+?)\s*\}\}/g, (_match, varName) => {
      const key = varName.trim()
      const filled = fillValues[key]
      if (filled) {
        return `<span class="inline-flex items-center bg-green-100 text-green-800 border border-green-200 px-1.5 py-0.5 rounded text-xs font-medium mx-0.5">${filled}</span>`
      }
      return `<span class="inline-flex items-center bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-xs font-mono mx-0.5">${key}</span>`
    })
    .replace(/\n/g, '<br />')
}

const STORAGE_KEY = 'pgTrackerEmailFillValues'

export default function EmailTemplates(): JSX.Element {
  const { emailTemplates, loadEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate, error, clearError } = useStore()

  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)
  const [editedName, setEditedName] = useState('')
  const [editedSubject, setEditedSubject] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [isFillModalOpen, setIsFillModalOpen] = useState(false)
  const [extractedVars, setExtractedVars] = useState<string[]>([])
  const [fillValues, setFillValues] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
  })
  const [copied, setCopied] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const initRef = useRef(false)

  // 监听 fillValues 变化，持久化到 localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fillValues))
  }, [fillValues])

  // 监听正文和主题变化，自动提取变量
  const usedVariables = useMemo(() => extractVariables(editedContent + editedSubject), [editedContent, editedSubject])

  // 预览 HTML：传入 fillValues，已填值显示绿色，未填显示蓝色
  const previewHtml = useMemo(() => renderPreviewText(editedContent, fillValues), [editedContent, fillValues])
  const previewSubjectHtml = useMemo(() => renderPreviewText(editedSubject, fillValues), [editedSubject, fillValues])

  useEffect(() => { loadEmailTemplates() }, [])

  useEffect(() => {
    if (!initRef.current && emailTemplates.length === 0) {
      initRef.current = true
      initDefaultTemplates()
    }
  }, [emailTemplates])

  const initDefaultTemplates = async () => {
    for (const tpl of defaultTemplates) {
      const result = await createEmailTemplate({ name: tpl.name, subject: tpl.subject, content: tpl.content })
      if (result && result.id) {
        for (const v of tpl.variables) {
          await window.api.emailVariable.create({ name: v, templateId: result.id })
        }
      }
    }
    await loadEmailTemplates()
  }

  const templates = emailTemplates.length > 0
    ? emailTemplates
    : defaultTemplates.map(t => ({ ...t, variables: t.variables.map((v: string) => ({ id: v, name: v, templateId: t.id })) }))

  const handleSelectTemplate = (template: any): void => {
    setSelectedTemplate(template)
    setEditedName(template.name)
    setEditedSubject(template.subject)
    setEditedContent(template.content)
    setSaved(false)
    setCopied(false)
    setIsFillModalOpen(false)
  }

  const handleSave = async (): Promise<void> => {
    if (!selectedTemplate) return
    try {
      await updateEmailTemplate(selectedTemplate.id, { name: editedName, subject: editedSubject, content: editedContent })
      await loadEmailTemplates()
      const latest = useStore.getState().emailTemplates.find((t: any) => t.id === selectedTemplate.id)
      if (latest) setSelectedTemplate(latest)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { clearError() }
  }

  const handleVariableInsert = (variableName: string): void => {
    const ta = textareaRef.current
    const insertion = `{{${variableName}}}`
    if (!ta) { setEditedContent(prev => prev + insertion); return }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const newContent = editedContent.substring(0, start) + insertion + editedContent.substring(end)
    setEditedContent(newContent)
    requestAnimationFrame(() => {
      const pos = start + insertion.length
      ta.focus()
      ta.setSelectionRange(pos, pos)
    })
  }

  // 痛点三：打开填写弹窗，变量从当前正文中提取
  const handleOpenFillModal = (): void => {
    const vars = usedVariables
    setExtractedVars(vars)
    // 用已保存的 fillValues 初始化弹窗表单
    const init: Record<string, string> = {}
    vars.forEach(v => { init[v] = fillValues[v] || '' })
    setFillValues(init)
    setIsFillModalOpen(true)
  }

  // 弹窗内实时更新 fillValues（同时更新 localStorage 和右侧预览）
  const handleFillChange = (name: string, value: string): void => {
    setFillValues(prev => ({ ...prev, [name]: value }))
  }

  // 痛点三：关闭弹窗只保存填写值，不复制
  const handleFillDone = (): void => {
    setIsFillModalOpen(false)
  }

  // 痛点三：独立的一键复制按钮 — 把占位符替换为实际填值后复制
  const handleCopyFinal = useCallback(async (): Promise<void> => {
    let content = editedContent
    let subject = editedSubject
    Object.entries(fillValues).forEach(([name, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`, 'g')
      content = content.replace(regex, value)
      subject = subject.replace(regex, value)
    })
    await navigator.clipboard.writeText(`主题：${subject}\n\n${content}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }, [editedContent, editedSubject, fillValues])

  const handleAddTemplate = async (): Promise<void> => {
    if (!newTemplateName.trim()) return
    const result = await createEmailTemplate({ name: newTemplateName.trim(), subject: '邮件主题', content: '邮件内容...' })
    await loadEmailTemplates()
    if (result && result.id) {
      const created = useStore.getState().emailTemplates.find((t: any) => t.id === result.id)
      if (created) handleSelectTemplate(created)
    }
    setNewTemplateName('')
    setShowAddTemplate(false)
  }

  const handleDeleteTemplate = async (templateId: string): Promise<void> => {
    if (!confirm('确定删除此模板？')) return
    await window.api.emailTemplate.delete(templateId)
    await loadEmailTemplates()
    if (selectedTemplate?.id === templateId) setSelectedTemplate(null)
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-[1400px] mx-auto">

        {/* 标题区 */}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">邮件模板库</h2>
            <p className="text-sm text-muted-foreground">所填即所见，所见即可复制</p>
          </div>
          {selectedTemplate && (
            <Button onClick={handleCopyFinal} disabled={copied} className="gap-1.5">
              {copied
                ? <><Check className="h-3.5 w-3.5" />已复制到剪贴板</>
                : <><Copy className="h-3.5 w-3.5" />一键复制最终邮件</>}
            </Button>
          )}
        </div>

        {/* 三栏：模板列表 | 编辑器 | 预览 */}
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_1fr] gap-5">

          {/* 左栏：模板列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">模板</span>
              <button onClick={() => setShowAddTemplate(!showAddTemplate)} className="text-muted-foreground hover:text-primary transition-colors" title="新建模板">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {showAddTemplate && (
              <div className="space-y-1">
                <Input placeholder="模板名称" value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddTemplate()}
                  autoFocus className="text-sm h-8" />
                <div className="flex gap-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleAddTemplate}><Plus className="h-3 w-3 mr-1" />创建</Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setShowAddTemplate(false); setNewTemplateName('') }}><X className="h-3 w-3" /></Button>
                </div>
              </div>
            )}
            <div className="space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              {templates.map((template: any) => (
                <div key={template.id} onClick={() => handleSelectTemplate(template)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all text-sm ${
                    selectedTemplate?.id === template.id
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'hover:bg-muted border border-transparent'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{template.name}</span>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0 p-0.5"
                    onClick={e => { e.stopPropagation(); handleDeleteTemplate(template.id) }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 中栏：编辑器 */}
          <div className="space-y-3">
            {!selectedTemplate ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg text-muted-foreground">
                <Mail className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">从左侧选择一个模板</p>
              </div>
            ) : (
              <>
                {/* 模板名称 + 保存 */}
                <div className="flex items-center gap-3">
                  <Input value={editedName} onChange={e => setEditedName(e.target.value)}
                    className="font-semibold text-base border-0 border-b border-transparent focus:border-primary focus:border-b-2 rounded-none px-0 h-auto shadow-none bg-transparent"
                    placeholder="模板名称" />
                  <div className="ml-auto flex gap-2">
                    <Button onClick={handleOpenFillModal} variant="outline" size="sm" className="gap-1.5">
                      <Edit2 className="h-3.5 w-3.5" />填写变量值
                    </Button>
                    <Button onClick={handleSave} disabled={saved} variant="outline" size="sm" className="gap-1.5">
                      {saved ? <><Check className="h-3.5 w-3.5" />已保存</> : <><Save className="h-3.5 w-3.5" />保存</>}
                    </Button>
                  </div>
                </div>

                {/* 邮件主题 */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">邮件主题</Label>
                  <Input value={editedSubject} onChange={e => setEditedSubject(e.target.value)}
                    className="font-mono text-sm" placeholder="输入邮件主题..." />
                </div>

                {/* 变量工具栏 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-xs text-muted-foreground">变量</Label>
                    {usedVariables.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{usedVariables.length} 个已用</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-1">· 点击插入到光标处</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLE_POOL.map(v => {
                      const isUsed = usedVariables.includes(v)
                      return (
                        <button key={v} onClick={() => handleVariableInsert(v)}
                          className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                            isUsed
                              ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                              : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                          }`}>{v}</button>
                      )
                    })}
                    {usedVariables.filter(v => !VARIABLE_POOL.includes(v)).map(v => (
                      <button key={v} onClick={() => handleVariableInsert(v)}
                        className="px-2 py-1 text-xs rounded border bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 cursor-pointer">{v}</button>
                    ))}
                  </div>
                </div>

                {/* 正文编辑 */}
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">正文内容</Label>
                  <Textarea ref={textareaRef} value={editedContent} onChange={e => setEditedContent(e.target.value)}
                    rows={16} className="font-mono text-sm border-muted-foreground/20 focus:border-primary rounded-md resize-none"
                    placeholder="在此编辑邮件内容，点击上方变量插入占位符..." />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}
              </>
            )}
          </div>

          {/* 右栏：实时预览 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">实时预览</span>
              <span className="text-xs text-muted-foreground ml-1">（蓝=未填，绿=已填）</span>
            </div>
            {!selectedTemplate ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg text-muted-foreground">
                <Eye className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">选择模板后在此预览</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
                {/* 窗口头部 */}
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                    <div className="h-2 w-2 rounded-full bg-green-400" />
                    <span className="ml-2 text-xs text-slate-400 font-mono">邮件预览</span>
                  </div>
                </div>
                {/* 主题 */}
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1">Subject</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug"
                    dangerouslySetInnerHTML={{ __html: previewSubjectHtml || '<span class="text-slate-300 italic">（空主题）</span>' }} />
                </div>
                {/* 正文 */}
                <div className="flex-1 px-5 py-4 overflow-y-auto">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-2">正文</p>
                  <div className="text-sm text-slate-800 dark:text-slate-200 leading-7 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: previewHtml || '<span class="text-slate-300 italic">（空正文）</span>' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 填写变量弹窗 — 靠左弹出，方便同时看到右侧预览 */}
      {isFillModalOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* 半透明遮罩 */}
          <div className="flex-1 bg-black/30" onClick={handleFillDone} />
          {/* 弹窗主体 — 靠左 */}
          <div className="w-[420px] bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-base">填写变量值</h3>
                <p className="text-xs text-muted-foreground mt-0.5">已填值实时显示在右侧预览区（绿色）</p>
              </div>
              <button onClick={handleFillDone} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {extractedVars.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">当前模板中暂未使用任何变量</p>
                  <p className="text-xs mt-1">在左侧编辑区点击"变量"按钮插入占位符后再来填写</p>
                </div>
              ) : (
                extractedVars.map((varName, i) => (
                  <div key={varName} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-muted px-1.5 py-1 rounded text-muted-foreground w-36 flex-shrink-0 text-right shrink-0">{varName}</span>
                      {fillValues[varName] && (
                        <span className="text-xs text-green-600 font-medium">✓ 已填</span>
                      )}
                    </div>
                    <Input placeholder={`输入 ${varName} 的值（可不填）`}
                      value={fillValues[varName] || ''}
                      onChange={e => handleFillChange(varName, e.target.value)}
                      autoFocus={i === 0}
                      className="text-sm" />
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-4 border-t border-border bg-muted/30 flex justify-end">
              <Button onClick={handleFillDone} size="sm" className="gap-1.5">
                <Check className="h-3.5 w-3.5" />完成（查看预览）
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
