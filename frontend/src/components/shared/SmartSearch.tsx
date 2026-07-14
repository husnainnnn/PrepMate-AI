import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchItem {
  label: string
  href: string
}

interface SmartSearchProps {
  items: SearchItem[]
  placeholder?: string
}

export default function SmartSearch({ items, placeholder = 'Search pages...' }: SmartSearchProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? items.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : []

  const handleSelect = (href: string) => {
    setQuery('')
    setShowDropdown(false)
    setSelectedIndex(-1)
    navigate(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      handleSelect(filtered[selectedIndex].href)
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
      setSelectedIndex(-1)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setSelectedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
      <Input
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setShowDropdown(true)
          setSelectedIndex(-1)
        }}
        onFocus={() => { if (query.trim()) setShowDropdown(true) }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="h-10 rounded-lg border-[#EAECF0] dark:border-[#334155] bg-[#F7F9FC] dark:bg-[#334155] pl-9 text-[13.5px] text-[#101828] dark:text-[#F1F5F9] placeholder:text-[#98A2B3] dark:placeholder:text-[#64748B] focus-visible:ring-[#1a6fa8]/30"
      />
      {showDropdown && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#1E293B] shadow-lg">
          {filtered.map((item, i) => (
            <button
              key={item.href}
              onClick={() => handleSelect(item.href)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors ${
                i === selectedIndex
                  ? 'bg-[#F7F9FC] dark:bg-[#334155] text-[#1a6fa8]'
                  : 'text-[#667085] dark:text-[#94A3B8] hover:bg-[#F7F9FC] dark:hover:bg-[#334155]'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${i === selectedIndex ? 'bg-[#1a6fa8]' : 'bg-[#D0D5DD] dark:bg-[#475569]'}`} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
