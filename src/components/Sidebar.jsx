import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  PieChart, 
  TrendingDown, 
  LineChart, 
  Coins,
  Snowflake,
  Plus,
  Upload,
  Download,
  Settings,
  ReceiptText
} from 'lucide-react';

const Sidebar = ({ onAddTransaction, onImportCsv, onExportData, onOpenSettings }) => {
  const navItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard", exact: true },
    { to: "/holdings", icon: <Briefcase size={20} />, label: "Holdings" },
    { to: "/transactions", icon: <ReceiptText size={20} />, label: "Transactions" },
    { to: "/sectors", icon: <PieChart size={20} />, label: "Sectors" },
    { to: "/dividends", icon: <Coins size={20} />, label: "Dividends" },
    { to: "/find-the-dip", icon: <TrendingDown size={20} />, label: "Find the Dip" },
    { to: "/performance", icon: <LineChart size={20} />, label: "Performance" }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Snowflake size={28} />
        <span>Snowball-IF</span>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.to} 
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="sidebar-bottom">
        <button className="btn btn-primary" onClick={onAddTransaction}>
          <Plus size={18} />
          <span>Add Transaction</span>
        </button>
        <button className="btn btn-outline" onClick={onExportData}>
          <Download size={18} />
          <span>Export Backup</span>
        </button>
        <button className="btn btn-outline" onClick={onImportCsv}>
          <Upload size={18} />
          <span>Import Data</span>
        </button>
        <button className="btn btn-outline mt-1" onClick={onOpenSettings} style={{ width: '100%' }}>
          <Settings size={18} />
          <span>API Key Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
