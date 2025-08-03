import React, { useState } from 'react';
import { useTransactionsCategoryViewModel } from '../viewModels/useTransactionsCategoryViewModel';
import type { TransactionCategory } from '../models/TransactionCategory';


export const TransactionsCategoryPage: React.FC = () => {
  const { transactionCategories, addTransactionCategory } = useTransactionsCategoryViewModel();
  
  const [parent_id, setParentId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newTransactionCategory: TransactionCategory = {
        id: 0, // Assuming the backend will assign the ID
        parent_id: parent_id ? parseInt(parent_id, 10) : undefined,

        name: name,
        description: description || undefined,
        _type: type,

        color: color || '#000000',
        icon: icon || 'default-icon',
    };
    addTransactionCategory(newTransactionCategory);
    setParentId('');
    setName('');
    setDescription('');
    setType('');
    setColor(''); 
    setIcon('');
  };

  return (
    <div>
      <h2>Transactions Categories</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Parent ID</th>

            <th>Name</th>
            <th>Description</th>
            <th>Type</th>

            <th>Color</th>
            <th>Icon</th>
          </tr>
        </thead>
        <tbody>
          {transactionCategories.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.parent_id}</td>
              <td>{s.name}</td>
              <td>{s.description}</td>
              <td>{s._type}</td>
              <td style={{ backgroundColor: s.color }}>{s.color}</td>
              <td><i className={s.icon}></i></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Add Transaction Category</h3>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Parent ID" value={parent_id} onChange={(e) => setParentId(e.target.value)} />
        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="text" placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} required />
        <input type="color" placeholder="Color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input type="text" placeholder="Icon" value={icon} onChange={(e) => setIcon(e.target.value)} />   

        <button type="submit">Add</button>
      </form>
    </div>
  );
};

export default TransactionsCategoryPage;