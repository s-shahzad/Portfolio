export function Card({ children }) {
    return <div className="bg-white rounded-xl shadow p-4">{children}</div>;
  }
  
  export function CardContent({ children, className }) {
    return <div className={className}>{children}</div>;
  }
  