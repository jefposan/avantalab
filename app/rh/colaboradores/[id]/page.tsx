import { notFound } from 'next/navigation'; import EmployeeProfile from '../../components/EmployeeProfile'; import { employees } from '../../data/mockData';
export function generateStaticParams(){return employees.map(e=>({id:e.id}))}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;const employee=employees.find(e=>e.id===id);if(!employee)notFound();return <EmployeeProfile employee={employee}/>}
