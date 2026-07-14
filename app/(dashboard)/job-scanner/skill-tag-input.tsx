"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { X, Loader2 } from "lucide-react"

interface SkillResult {
  id: string
  label: string
}

export interface Skill {
  id: string
  preferredLabel: string
}

export function SkillTagInput({
  value,
  onChange,
}: {
  value: Skill[]
  onChange: (skills: Skill[]) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SkillResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounced search against the Upwork skill ontology.
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/upwork/skills?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json.error ?? "Search failed")
          setResults([])
        } else {
          setResults(json.skills ?? [])
          setOpen(true)
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Search failed")
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // Close dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  function addSkill(skill: Skill) {
    const label = skill.preferredLabel.trim()
    if (!label) return
    if (!value.some((s) => s.preferredLabel.toLowerCase() === label.toLowerCase())) {
      onChange([...value, { ...skill, preferredLabel: label }])
    }
    setQuery("")
    setResults([])
    setOpen(false)
  }

  function removeSkill(preferredLabel: string) {
    onChange(value.filter((s) => s.preferredLabel !== preferredLabel))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !query && value.length) {
      removeSkill(value[value.length - 1].preferredLabel)
    }
    if (e.key === "Enter") {
      e.preventDefault()
      if (results.length) addSkill({ id: results[0].id, preferredLabel: results[0].label })
      else if (query.trim()) addSkill({ id: "", preferredLabel: query })
    }
  }

  const available = results.filter(
    (r) => !value.some((s) => s.preferredLabel.toLowerCase() === r.label.toLowerCase())
  )

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-3xl border border-transparent bg-input/50 px-3 py-1.5 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30"
        )}
      >
        {value.map((skill) => (
          <span
            key={skill.preferredLabel}
            className="inline-flex items-center gap-1 rounded-full bg-primary/15 py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
          >
            {skill.preferredLabel}
            <button
              type="button"
              onClick={() => removeSkill(skill.preferredLabel)}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
              aria-label={`Remove ${skill.preferredLabel}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length && setOpen(true)}
          placeholder={value.length ? "" : "Search skills…"}
          className="h-6 min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {open && (available.length > 0 || error) && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-2xl border border-border bg-popover p-1 shadow-lg">
          {error ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">{error}</p>
          ) : (
            available.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addSkill({ id: r.id, preferredLabel: r.label })}
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {r.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
