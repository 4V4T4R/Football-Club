"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { resolveActiveClub } from "@/lib/activeClub";

export default function NewPlayerPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentExpiry, setDocumentExpiry] = useState("");

  const [shirtNumber, setShirtNumber] = useState("");
  const [role, setRole] = useState("");
  const [matricola, setMatricola] = useState("");
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full h-12 rounded-xl border border-theme bg-panel-theme px-3 text-base";

  async function addPlayer() {
    setError(null);

    // obbligatori base
    if (!firstName || !lastName || !birthDate) {
        setError("Compila tutti i campi obbligatori.");
        return;
    }

    // 👉 validazione documento
    if (documentType) {
        if (!documentNumber) {
        setError("Numero documento obbligatorio.");
        return;
        }

        if (!documentExpiry) {
        setError("Data di scadenza obbligatoria.");
        return;
        }
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (!userId) return;

    const active = await resolveActiveClub(supabase, userId);

    if (!active.clubId || !active.isStaff) {
        setError("Non hai i permessi per aggiungere giocatori in questa squadra.");
        return;
    }

    await fetch("/api/players/create", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
        club_id: active.clubId,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        birth_date: birthDate || null,
        document_type: documentType || null,
        document_number: documentNumber || null,
        document_expiry: documentExpiry || null,
        shirt_number: shirtNumber ? Number(shirtNumber) : null,
        role: role || null,
        matricola: matricola || null,
        }),
    });

    router.push("/giocatori");
    }

  return (
    <div className="card max-w-full mx-auto min-h-screen p-5 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <button
            onClick={() => router.back()}
            className="text-sm font-semibold text-base-theme"
        >
            ← Indietro
        </button>

        <h1 className="text-lg font-semibold text-base-theme text-center flex-1">
            Aggiungi giocatore
        </h1>

        {/* spazio per bilanciare */}
        <div className="w-[80px]" />
      </div>

      {/* DATI BASE */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-base-theme">
            Dati personali
        </div>

        <input
          className={inputClass}
          placeholder="Nome *"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Cognome *"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className={inputClass}
          placeholder="Telefono"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div>
            <label className="text-sm font-semibold text-base-theme">
                    Data di nascita *
            </label>
            <input
            type="date"
            className={inputClass}
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            />
        </div>
      </div>

      {/* DOCUMENTO */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-base-theme">
            Documento
        </div>

        <select
          className={inputClass}
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          <option value="">Tipo documento</option>
          <option value="carta_identita">Carta d'identità</option>
          <option value="patente">Patente</option>
          <option value="passaporto">Passaporto</option>
        </select>

        {documentType && (
          <>
            <input
              className={inputClass}
              placeholder="Numero documento"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
            />
    
            <label className="text-sm font-semibold text-base-theme">
                    Data di scadenza <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputClass}
              value={documentExpiry}
              onChange={(e) => setDocumentExpiry(e.target.value)}
            />
          </>
        )}
      </div>

      {/* SQUADRA */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-base-theme">
            Dati squadra
        </div>

        <input
          className={inputClass}
          placeholder="Numero maglia"
          value={shirtNumber}
          onChange={(e) => setShirtNumber(e.target.value)}
        />

        <select
          className={inputClass}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Ruolo</option>
          <option value="POR">Portiere</option>
          <option value="DC">Difensore</option>
          <option value="CC">Centrocampista</option>
          <option value="ATT">Attaccante</option>
        </select>

        <input
          className={inputClass}
          placeholder="Matricola"
          value={matricola}
          onChange={(e) => setMatricola(e.target.value)}
        />
      </div>

      {/* CTA */}
      <button
        onClick={addPlayer}
        className="w-full h-12 rounded-xl border border-theme bg-panel-theme font-medium"
      >
        Aggiungi giocatore
      </button>
      <p className="text-xs text-muted-theme text-center mt-2">
        * Campi obbligatori
      </p>
      {error && (
        <div className="text-sm text-red-500 text-center">
            {error}
        </div>
      )}
    </div>
  );
}
