import type { Metadata } from "next";
import CustosPrototype from "./CustosPrototype";
import "./custos.css";

export const metadata: Metadata = {
  title: "Custos e Precificação — Protótipo AvantaLab",
  description:
    "Protótipo sem integração de dados para validar montagem de custos e formação de preços.",
};

export default function CustosPage() {
  return <CustosPrototype />;
}
