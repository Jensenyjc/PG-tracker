import { useState } from 'react'
import { Copy, Check, Mail, Edit2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  variables: string[]
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: 'self-intro',
    name: '自荐信',
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
    id: 'inquiry',
    name: '询问名额',
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
    id: 'thank-you',
    name: '感谢信',
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

export default function EmailTemplates(): JSX.Element {
  const [templates] = useState<EmailTemplate[]>(defaultTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editedContent, setEditedContent] = useState('')
  const [copied, setCopied] = useState(false)

  const handleSelectTemplate = (template: EmailTemplate): void => {
    setSelectedTemplate(template)
    setEditedContent(template.content)
    setCopied(false)
  }

  const handleCopy = async (): Promise<void> => {
    if (!selectedTemplate) return
    let content = editedContent
    selectedTemplate.variables.forEach((v) => { content = content.replace(new RegExp(`{{${v}}}`, 'g'), `[${v}]`) })
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVariableInsert = (variable: string): void => {
    if (!selectedTemplate) return
    setEditedContent((prev) => prev + `{{${variable}}}`)
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold">邮件模板库</h2>
          <p className="text-muted-foreground">管理常用邮件模板，支持变量替换</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">选择模板</h3>
            {templates.map((template) => (
              <Card key={template.id} className={`cursor-pointer transition-colors ${selectedTemplate?.id === template.id ? 'border-primary' : ''}`} onClick={() => handleSelectTemplate(template)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{template.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="col-span-2">
            {selectedTemplate ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2"><Edit2 className="h-5 w-5" />{selectedTemplate.name}</CardTitle>
                  <Button onClick={handleCopy} disabled={copied}>
                    {copied ? <><Check className="h-4 w-4 mr-1" />已复制</> : <><Copy className="h-4 w-4 mr-1" />复制</>}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>邮件主题</Label>
                    <Input value={selectedTemplate.subject} readOnly className="font-mono text-sm" />
                  </div>
                  <div>
                    <Label className="mb-2">可用变量（点击插入）</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((v) => (
                        <button key={v} onClick={() => handleVariableInsert(v)} className="px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80 font-mono">{`{{${v}}}`}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>邮件内容</Label>
                    <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={15} className="font-mono text-sm" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground py-12">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>选择一个模板开始编辑</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
