import Layout from "../../components/Layout";

export default function AboutReceiptifyPage() {
  const stats = [
    {
      label: 'Developers',
      value: '2',
      sub: 'Project Members',
      bg: 'bg-blue-50',
      color: 'text-blue-600',
    },
    {
      label: 'Technologies',
      value: '8+',
      sub: 'Modern Stack',
      bg: 'bg-green-50',
      color: 'text-green-600',
    }
  ]

  const technologies = [
    'React',
    'TypeScript',
    'Node.js',
    'Express',
    'PostgreSQL',
    'Supabase',
    'Tailwind CSS',
    'OCR',
  ]

  return (
    <Layout>
      {/* Hero */}
      <div className="bg-blue-50/60 rounded-2xl px-8 py-8 mb-6 flex items-center justify-between overflow-hidden">
        <div className="max-w-lg">
          <p className="uppercase tracking-[0.25em] text-xs text-blue-600 font-semibold mb-2">
            ABOUT RECEIPTIFY
          </p>

          <h2 className="text-3xl font-bold text-gray-900 leading-tight">
            Built by students,
            <span className="text-blue-600"> designed for businesses.</span>
          </h2>

          <p className="text-sm text-gray-500 mt-4 leading-7">
            Receiptify is a modern receipt management platform that helps
            businesses organize, scan and manage receipts effortlessly.
            Our goal is to replace manual bookkeeping with a fast,
            beautiful and intelligent experience.
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border border-gray-100 rounded-2xl p-5"
          >
            <div
              className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color}
              flex items-center justify-center mb-6`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12h18M12 3v18"
                />
              </svg>
            </div>

            <p className="text-xs text-gray-400">
              {stat.label}
            </p>

            <p className="text-2xl font-bold text-gray-900 mt-1">
              {stat.value}
            </p>

            <p className="text-xs text-gray-400 mt-1">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* About Project */}
      <div className="border border-gray-100 rounded-2xl p-8 mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-gray-400 font-semibold mb-3">
          ABOUT RECEIPTIFY
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          What is Receiptify?
        </h2>

        <p className="text-gray-500 leading-8">
          Receiptify is a modern receipt management platform designed to
          simplify the way businesses organize financial records.
          Instead of manually entering receipt information,
          users can upload receipts, manage businesses,
          track spending and keep all financial documents
          in one organized dashboard.
        </p>

        <p className="text-gray-500 leading-8 mt-5">
          The project was developed as a university software engineering
          project using modern web technologies with a strong focus on
          clean user experience, responsive design and scalable architecture.
        </p>

        {/* Technology Stack */}
        <div className="flex flex-wrap gap-3 mt-8">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 rounded-full
              bg-blue-50
              text-blue-600
              text-sm
              font-medium"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </Layout>
  );
}