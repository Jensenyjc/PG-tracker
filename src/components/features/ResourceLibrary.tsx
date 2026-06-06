/**
 * @Project: PG-Tracker
 * @File: ResourceLibrary.tsx
 * @Description: 个人资料库页面，用于汇总保研申请相关文件和文件夹路径
 * @Author: 杨敬诚
 * @Date: 2026-06-06
 * Copyright (c) 2026. All rights reserved.
 */
import { useEffect, useMemo, useState } from 'react'
import { Database, FileArchive, FileSpreadsheet, FileText, Folder, FolderOpen, Pencil, Plus, Search, Trash2, ExternalLink, File, Presentation, FileType } from 'lucide-react'
import { useStore, type PersonalResource } from '../../stores/appStore'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { ConfirmDialog } from '../ui/confirm-dialog'
import { cn, formatDateSafe, parsePolicyTags } from '../../lib/utils'

const RESOURCE_CATEGORIES = ['申请材料', '成绩证明', '竞赛科研', '推荐信', '简历自荐', '面试材料', '证件照片', '学校材料', '其他'] as const
const ALL_CATEGORIES = '__all__'
const ALL_KINDS = '__all__'

type ResourceCategory = typeof RESOURCE_CATEGORIES[number]
type ResourceKindFilter = typeof ALL_KINDS | PersonalResource['kind']

function getResourceIcon(resource: PersonalResource): JSX.Element {
  if (resource.kind === 'FOLDER') return <Folder className="h-4 w-4 text-amber-500" />
  const type = (resource.fileType || '').toLowerCase()
  if (['xlsx', 'xls', 'csv'].includes(type)) return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
  if (['ppt', 'pptx'].includes(type)) return <Presentation className="h-4 w-4 text-orange-600" />
  if (['doc', 'docx', 'md', 'txt', 'tex'].includes(type)) return <FileText className="h-4 w-4 text-blue-600" />
  if (type === 'pdf') return <FileType className="h-4 w-4 text-red-600" />
  if (['zip', 'rar', '7z'].includes(type)) return <FileArchive className="h-4 w-4 text-violet-600" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

function getTypeLabel(resource: PersonalResource): string {
  if (resource.kind === 'FOLDER') return '文件夹'
  return resource.fileType ? resource.fileType.toUpperCase() : '文件'
}

function formatFileSize(sizeBytes: number | null): string {
  if (sizeBytes == null) return '-'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
  return `${(sizeBytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

function includesText(value: string | null | undefined, keyword: string): boolean {
  return (value || '').toLowerCase().includes(keyword)
}

function ResourceEditDialog({
  resource,
  onClose
}: {
  resource: PersonalResource
  onClose: () => void
}): JSX.Element {
  const { updatePersonalResource } = useStore()
  const [name, setName] = useState(resource.name)
  const [category, setCategory] = useState(resource.category)
  const [tags, setTags] = useState(parsePolicyTags(resource.tags).join('、'))
  const [notes, setNotes] = useState(resource.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      setError('资料名称不能为空')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await updatePersonalResource(resource.id, {
        name: name.trim(),
        category,
        tags: tags.split(/[、,，\n]/).map((tag) => tag.trim()).filter(Boolean),
        notes: notes.trim() || null
      })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>编辑资料</DialogTitle>
          <DialogDescription>调整资料名称、分类、标签和备注</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="resource-name">资料名称</Label>
            <Input id="resource-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="resource-category">分类</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="resource-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESOURCE_CATEGORIES.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="resource-tags">标签</Label>
            <Input id="resource-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="用顿号、逗号或换行分隔" />
          </div>
          <div>
            <Label htmlFor="resource-notes">备注</Label>
            <Textarea id="resource-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="例如：用于华师面试、已更新最终版" />
          </div>
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground break-all">
            {resource.localPath}
          </div>
        </div>
        <DialogFooter>
          {error && <p className="text-xs text-destructive mr-auto">{error}</p>}
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => { void handleSave() }} disabled={isSaving}>{isSaving ? '保存中...' : '保存修改'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ResourceLibrary(): JSX.Element {
  const { personalResources, loadPersonalResources, addPersonalResourcesFromPaths, deletePersonalResource } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>(ALL_CATEGORIES)
  const [kind, setKind] = useState<ResourceKindFilter>(ALL_KINDS)
  const [importCategory, setImportCategory] = useState<ResourceCategory>('其他')
  const [editingResource, setEditingResource] = useState<PersonalResource | null>(null)
  const [deletingResource, setDeletingResource] = useState<PersonalResource | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadPersonalResources()
  }, [loadPersonalResources])

  const filteredResources = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return personalResources.filter((resource) => {
      const tags = parsePolicyTags(resource.tags).join(' ')
      const matchesKeyword = !keyword
        || includesText(resource.name, keyword)
        || includesText(resource.localPath, keyword)
        || includesText(resource.category, keyword)
        || includesText(resource.notes, keyword)
        || includesText(tags, keyword)
      const matchesCategory = category === ALL_CATEGORIES || resource.category === category
      const matchesKind = kind === ALL_KINDS || resource.kind === kind
      return matchesKeyword && matchesCategory && matchesKind
    })
  }, [category, kind, personalResources, query])

  const counts = useMemo(() => ({
    total: personalResources.length,
    files: personalResources.filter((resource) => resource.kind === 'FILE').length,
    folders: personalResources.filter((resource) => resource.kind === 'FOLDER').length,
    categories: new Set(personalResources.map((resource) => resource.category)).size
  }), [personalResources])

  const handleSelectFiles = async (): Promise<void> => {
    setError(null)
    try {
      const paths = await window.api.file.selectPaths({
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '申请资料', extensions: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'md', 'txt', 'tex', 'zip', 'rar', '7z', 'jpg', 'jpeg', 'png'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (paths.length > 0) await addPersonalResourcesFromPaths(paths, importCategory)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '添加文件失败')
    }
  }

  const handleSelectFolders = async (): Promise<void> => {
    setError(null)
    try {
      const paths = await window.api.file.selectPaths({
        properties: ['openDirectory', 'multiSelections']
      })
      if (paths.length > 0) await addPersonalResourcesFromPaths(paths, importCategory)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '添加文件夹失败')
    }
  }

  const handleOpen = async (resource: PersonalResource): Promise<void> => {
    setError(null)
    try {
      await window.api.file.openExternal(resource.localPath)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '无法打开该路径，请确认文件仍存在')
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!deletingResource) return
    try {
      await deletePersonalResource(deletingResource.id)
      setDeletingResource(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '删除失败')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <header className="p-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            个人资料库
          </h2>
          <p className="text-sm text-muted-foreground">申请材料、证明文件、简历、自荐信、面试资料</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={importCategory} onValueChange={(value) => setImportCategory(value as ResourceCategory)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESOURCE_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { void handleSelectFolders() }}>
            <FolderOpen className="h-4 w-4 mr-2" />
            添加文件夹
          </Button>
          <Button onClick={() => { void handleSelectFiles() }}>
            <Plus className="h-4 w-4 mr-2" />
            添加文件
          </Button>
        </div>
      </header>

      <div className="p-4 border-b border-border grid grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">资料总数</p>
          <p className="text-2xl font-bold">{counts.total}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">文件</p>
          <p className="text-2xl font-bold">{counts.files}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">文件夹</p>
          <p className="text-2xl font-bold">{counts.folders}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">分类</p>
          <p className="text-2xl font-bold">{counts.categories}</p>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="搜索名称、路径、分类、标签或备注" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>全部分类</SelectItem>
            {RESOURCE_CATEGORIES.map((item) => (
              <SelectItem key={item} value={item}>{item}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kind} onValueChange={(value) => setKind(value as ResourceKindFilter)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_KINDS}>全部类型</SelectItem>
            <SelectItem value="FILE">文件</SelectItem>
            <SelectItem value="FOLDER">文件夹</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-[minmax(240px,2fr)_120px_110px_120px_minmax(220px,1.5fr)_120px] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/50">
            <div>名称</div>
            <div>分类</div>
            <div>类型</div>
            <div>大小</div>
            <div>路径与标签</div>
            <div className="text-right">操作</div>
          </div>
          {filteredResources.length > 0 ? (
            filteredResources.map((resource) => {
              const tags = parsePolicyTags(resource.tags)
              return (
                <div key={resource.id} className="grid grid-cols-[minmax(240px,2fr)_120px_110px_120px_minmax(220px,1.5fr)_120px] gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/35 transition-colors">
                  <button className="min-w-0 flex items-start gap-2 text-left" onClick={() => { void handleOpen(resource) }}>
                    <span className="mt-0.5">{getResourceIcon(resource)}</span>
                    <span className="min-w-0">
                      <span className="block font-medium truncate">{resource.name}</span>
                      <span className="block text-xs text-muted-foreground">{formatDateSafe(resource.modifiedAt, 'yyyy/MM/dd HH:mm')}</span>
                    </span>
                  </button>
                  <div className="flex items-start">
                    <Badge variant="secondary" className="text-xs">{resource.category}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">{getTypeLabel(resource)}</div>
                  <div className="text-sm text-muted-foreground">{formatFileSize(resource.sizeBytes)}</div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate" title={resource.localPath}>{resource.localPath}</p>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-accent text-accent-foreground">{tag}</span>
                        ))}
                        {tags.length > 3 && <span className="text-xs text-muted-foreground">+{tags.length - 3}</span>}
                      </div>
                    )}
                    {resource.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{resource.notes}</p>}
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { void handleOpen(resource) }}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingResource(resource)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingResource(resource)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className={cn('py-16 text-center text-muted-foreground', personalResources.length === 0 && 'bg-muted/20')}>
              <Database className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p className="font-medium">{personalResources.length === 0 ? '还没有资料' : '没有匹配的资料'}</p>
              <p className="text-sm mt-1">{personalResources.length === 0 ? '暂无记录' : '调整搜索词或筛选条件后再试'}</p>
            </div>
          )}
        </div>
      </div>

      {editingResource && (
        <ResourceEditDialog resource={editingResource} onClose={() => setEditingResource(null)} />
      )}

      <ConfirmDialog
        open={!!deletingResource}
        onOpenChange={(open) => { if (!open) setDeletingResource(null) }}
        title="删除资料记录"
        description={deletingResource ? `确定从资料库中移除“${deletingResource.name}”吗？这只会删除软件里的记录，不会删除电脑上的原文件。` : ''}
        confirmText="删除记录"
        cancelText="取消"
        variant="destructive"
        onConfirm={() => { void handleDelete() }}
      />
    </div>
  )
}
