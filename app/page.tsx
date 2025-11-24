export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="glass rounded-3xl p-12 max-w-2xl text-center shadow-2xl">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Talep Yönetim Sistemi
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Modern ve akıllı talep yönetim platformu
        </p>
        <div className="flex gap-4 justify-center">
          <div className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors cursor-pointer">
            Giriş Yap
          </div>
          <div className="px-6 py-3 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-lg font-semibold border-2 border-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
            Daha Fazla Bilgi
          </div>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-6 text-sm">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-3xl mb-2">🤖</div>
            <div className="font-semibold">AI Destekli</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-semibold">Hızlı & Güvenli</div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold">Analitik</div>
          </div>
        </div>
      </div>
    </main>
  );
}
