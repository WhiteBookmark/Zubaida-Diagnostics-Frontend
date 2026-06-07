export default function Dashboard({ onLogout }) {
  return (
    <div className="auth-container">
      <h2>Hello World</h2>
      <p>Welcome to the Dashboard.</p>
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}
