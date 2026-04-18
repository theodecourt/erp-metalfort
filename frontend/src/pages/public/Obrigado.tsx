import { Link, useSearchParams } from 'react-router-dom';

export default function Obrigado() {
  const [sp] = useSearchParams();
  const pdfUrl = sp.get('pdf');
  const numero = sp.get('numero');

  return (
    <div className="min-h-screen bg-mf-black text-white flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <div className="text-6xl">✓</div>
        <h1 className="mt-4 text-3xl font-extrabold">Orçamento enviado!</h1>
        {numero && <div className="mt-2 text-mf-text-secondary">Nº {numero}</div>}
        <p className="mt-4 text-mf-text-secondary">
          Enviamos uma cópia no seu email. Nossa equipe vai entrar em contato em breve.
        </p>
        {pdfUrl && (
          <a
            href={pdfUrl}
            className="mt-8 inline-block px-6 py-3 bg-mf-yellow text-mf-black font-bold rounded hover:bg-mf-yellow-hover"
            target="_blank" rel="noreferrer"
          >
            Baixar PDF
          </a>
        )}
        <div className="mt-6">
          <Link to="/" className="text-mf-yellow hover:underline">← Voltar para a vitrine</Link>
        </div>
      </div>
    </div>
  );
}
