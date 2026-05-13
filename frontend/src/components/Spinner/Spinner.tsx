interface Props {
  size?: number;       // diameter em px
  className?: string;  // extra classes; cor do circulo herda do text color do pai via border-current
}

export default function Spinner({ size = 12, className = '' }: Props) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      style={{ width: size, height: size }}
      className={`inline-block border-2 border-current border-r-transparent rounded-full animate-spin ${className}`}
    />
  );
}
