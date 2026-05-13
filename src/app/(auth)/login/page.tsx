'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/paciente')
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#29ABE2] to-[#1a7fad] rounded-xl flex items-center justify-center text-white font-black text-lg">
            C|M
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#0C3547]">
              Centro Metabólico <span className="text-[#29ABE2]">Pro</span>
            </h1>
            <p className="text-xs text-[#6B7C93]">Motor clínico-comercial</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-[#0C3547] mb-6">Iniciar sesión</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0C3547] mb-1">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0C3547] mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-[#D6E3ED] rounded-xl text-[#1E2D3D] focus:outline-none focus:border-[#29ABE2] focus:ring-2 focus:ring-[#29ABE2]/20 transition"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-[#0C3547] to-[#145272] text-white font-bold rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6B7C93] mt-6">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="text-[#29ABE2] font-semibold hover:underline">
            Regístrate gratis
          </a>
        </p>
      </motion.div>
    </div>
  )
}
