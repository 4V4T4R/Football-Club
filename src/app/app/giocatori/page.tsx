"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function formatDateIT(date: string) {
  if (!date) return "—";

  const iso = date.includes("T") ? date.split("T")[0] : date; // YYYY-MM-DD
  const parts = iso.split("-");

  if (parts.length !== 3) return "—";

  const y = parts[0];
  const m = parts[1];
  const d = parts[2];

  return (
    d.padStart(2, "0") +
    "/" +
    m.padStart(2, "0") +
    "/" +
    y.padStart(4, "0")
  );
}

type Club = { id: string; name: string; slug: string };

type Player = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  shirt_number: number | null;
  active: boolean;
};

export default function PlayersPage() {
  const [role, setRole] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form add
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [shirtNumber, setShirtNumber] = useState<string>("");

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editShirtNumber, setEditShirtNumber] = useState<string>("");

  const canSubmit = useMemo(() => {
    return firstName.trim() && lastName.trim() && birthDate && email.trim();
  }, [firstName, lastName, birthDate, email]);

  async function loadClubAndPlayers() {
    setLoading(true);
    setError(null);

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    if (userId) {
      const { data: membership } = await supabase
        .from("club_members")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      setRole(membership?.role ?? null);
    }

    if (!userId) {
      setError("Utente non autenticato.");
      setLoading(false);
      return;
    }

    // 1️⃣ verifica se è staff
    const { data: member, error: memberErr } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr) {
      setError("Errore club_members: " + memberErr.message);
      setLoading(false);
      return;
    }

    let clubId: string | null = null;

    if (member?.club_id) {
      clubId = member.club_id;
    } else {
      // 2️⃣ verifica se è player
      const { data: player, error: playerErr } = await supabase
        .from("players")
        .select("club_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (playerErr) {
        setError("Errore players: " + playerErr.message);
        setLoading(false);
        return;
      }

      if (player?.club_id) {
        clubId = player.club_id;
      }
    }

    if (!clubId) {
      setError("Impossibile determinare la squadra.");
      setLoading(false);
      return;
    }

    // 3️⃣ carica club
    const { data: clubData, error: clubErr } = await supabase
      .from("clubs")
      .select("id, name, slug")
      .eq("id", clubId)
      .single();

    if (clubErr || !clubData) {
      setError("Impossibile caricare la squadra.");
      setLoading(false);
      return;
    }

    setClub(clubData);

    // 4️⃣ carica eventi
    const { data: playersData, error: playersErr } = await supabase
      .from("players")
      .select("id, first_name, last_name, birth_date, shirt_number, active")
      .eq("club_id", clubId)
      .order("active", { ascending: false })
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (playersErr) setError(playersErr.message);
    setPlayers(playersData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadClubAndPlayers();
  }, []);

  function startEdit(p: Player) {
    setEditingId(p.id);
    setEditFirstName(p.first_name);
    setEditLastName(p.last_name);
    setEditBirthDate(p.birth_date);
    setEditShirtNumber(p.shirt_number?.toString() ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFirstName("");
    setEditLastName("");
    setEditBirthDate("");
    setEditShirtNumber("");
  }

  async function saveEdit(playerId: string) {
    setError(null);

    const shirt = editShirtNumber.trim() ? Number(editShirtNumber) : null;
    if (editShirtNumber.trim() && Number.isNaN(shirt)) {
      setError("Numero maglia non valido.");
      return;
    }

    const { error: updErr } = await supabase
      .from("players")
      .update({
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        birth_date: editBirthDate,
        shirt_number: shirt,
      })
      .eq("id", playerId);

    if (updErr) {
      setError(updErr.message);
      return;
    }

    cancelEdit();
    await loadClubAndPlayers();
  }

  async function toggleActive(p: Player) {
    setError(null);
    const { error: updErr } = await supabase
      .from("players")
      .update({ active: !p.active })
      .eq("id", p.id);

    if (updErr) {
      setError(updErr.message);
      return;
    }

    await loadClubAndPlayers();
  }

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!club || !canSubmit) return;

    setError(null);

    const shirt = shirtNumber.trim() ? Number(shirtNumber) : null;
    if (shirtNumber.trim() && Number.isNaN(shirt)) {
      setError("Numero maglia non valido.");
      return;
    }

    const res = await fetch("/api/players/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        club_id: club.id,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),           // <-- serve davvero
        birth_date: birthDate || null, // <-- se nel DB è NOT NULL, qui deve essere obbligatorio
        shirt_number: shirt ? shirt : null,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json?.error ?? "Errore creazione giocatore");
      return;
    }

    setFirstName("");
    setLastName("");
    setBirthDate("");
    setShirtNumber("");
    setEmail("");

    await loadClubAndPlayers();
  }

  if (loading) return <div className="card p-8">Caricamento...</div>;
  const inputClass =
  "w-full h-11 rounded-md border border-theme bg-panel-theme px-3 text-[16px] md:text-sm";

  return (
    <div className="space-y-6">
      <div className="card p-8">
        <h1 className="text-2xl font-semibold text-base-theme">Giocatori</h1>
        <p className="mt-2 text-muted-theme">
          Gestisci la rosa della squadra {club?.name ? <b>{club.name}</b> : null}.
        </p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,2.6fr)_300px]">
        {/* Lista */}
        <div className="card p-6 min-w-0">
          <h2 className="text-lg font-semibold text-base-theme">Rosa</h2>

          {players.length === 0 ? (
            <p className="mt-4 text-muted-theme">Nessun giocatore inserito.</p>
          ) : (
            <>
              {/* MOBILE LIST */}
              <div className="mt-4 md:hidden space-y-2">
                {players.map((p) => {
                  const editing = editingId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={[
                        "rounded-xl border border-theme bg-panel-theme p-3",
                        p.active ? "" : "opacity-60",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-base-theme truncate">
                            {p.last_name} {p.first_name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-theme">
                            <span className="inline-flex items-center gap-1">
                              👕 <b className="font-medium text-base-theme">{p.shirt_number ?? "—"}</b>
                            </span>

                            <span className="inline-flex items-center gap-1">
                              🎂 {formatDateIT(p.birth_date)}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                          <span
                            className={[
                              "inline-block h-2.5 w-2.5 rounded-full",
                              p.active ? "bg-emerald-500" : "bg-red-500",
                            ].join(" ")}
                            aria-label={p.active ? "Attivo" : "Non attivo"}
                          />
                          {(role === "admin" || role === "staff") && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                onClick={() => startEdit(p)}
                                title="Modifica"
                              >
                                🖋️
                              </button>
                              <button
                                type="button"
                                className="h-9 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                onClick={() => toggleActive(p)}
                                title={p.active ? "Disattiva" : "Attiva"}
                              >
                                {p.active ? "❌" : "✅"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* EDIT mobile: se vuoi, puoi aprire la stessa sezione che già hai */}
                      {editing && (
                        <div className="mt-3 rounded-xl border border-theme bg-panel-theme p-3 space-y-3">
                          <div className="grid gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Cognome</label>
                              <input className={inputClass} value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Nome</label>
                              <input className={inputClass} value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Data di nascita</label>
                              <input type="date" className={inputClass} value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-muted-theme">Numero maglia</label>
                              <input className={inputClass} value={editShirtNumber} onChange={(e) => setEditShirtNumber(e.target.value)} />
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button type="button" className="rounded-md border border-theme bg-panel-theme px-4 py-2" onClick={() => saveEdit(p.id)}>
                              Salva
                            </button>
                            <button type="button" className="rounded-md border border-theme bg-panel-theme px-4 py-2" onClick={cancelEdit}>
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* DESKTOP TABLE */}
              <div className="mt-4 hidden md:block rounded-xl border border-theme overflow-hidden max-w-full">
                <div className="w-full max-w-full overflow-x-auto">
                  <table className="min-w-[440px] md:min-w-[440px] w-full table-fixed text-sm">
                    <thead>
                      <tr className="bg-panel-theme">
                        <th className="px-3 py-2 text-left w-[180px] md:w-[180px]">Nome</th>
                        <th className="px-3 py-2 text-left whitespace-nowrap w-[100px] md:w-[100px]">Nascita</th>
                        <th className="px-3 py-2 text-center w-[70px] md:w-[70px]">Maglia</th>
                        <th className="px-3 py-2 text-center w-[30px] md:w-[30px]">●</th>
                        <th className="px-3 py-2 text-center w-[100px] md:w-[100px]">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((p) => {
                        const editing = editingId === p.id;

                        return (
                          <Fragment key={p.id}>
                            <tr
                              className={[
                                "border-t border-theme align-middle",
                                p.active ? "" : "opacity-60",
                              ].join(" ")}
                            >
                              <td className="px-3 py-2 align-middle whitespace-nowrap">                               
                                <span>
                                  {p.last_name} {p.first_name}
                                </span>
                              </td>

                              <td className="px-3 py-2 align-middle">
                                <div className="flex justify-center gap-2">
                                  {formatDateIT(p.birth_date)}
                                </div>
                              </td>

                              <td className="px-3 py-2 align-middle">
                                <div className="flex justify-center gap-2">
                                  {p.shirt_number ?? "—"}
                                </div>
                              </td>

                              <td className="px-3 py-2 align-middle">
                                <div className="flex justify-center gap-2">
                                  <span
                                    className={[
                                      "inline-block h-2.5 w-2.5 rounded-full",
                                      p.active ? "bg-emerald-500" : "bg-red-500",
                                    ].join(" ")}
                                    title={p.active ? "Attivo" : "Non attivo"}
                                    aria-label={p.active ? "Attivo" : "Non attivo"}
                                  />
                                  </div>
                              </td>

                              <td className="px-3 py-2">
                                {(role === "admin" || role === "staff") && (
                                  <div className="flex justify-center gap-2">
                                    {editing ? (
                                      <>
                                        <button
                                          type="button"
                                          className="h-8 w-8 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                          onClick={() => saveEdit(p.id)}
                                          title="Salva"
                                        >
                                          💾
                                        </button>
                                        <button
                                          type="button"
                                          className="h-8 w-8 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                          onClick={cancelEdit}
                                          title="Annulla"
                                        >
                                          ✖️
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          className="h-8 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                          onClick={() => startEdit(p)}
                                          title="Modifica"
                                        >
                                          🖋️
                                        </button>
                                        <button
                                          type="button"
                                          className="h-8 w-9 rounded-md border border-theme bg-panel-theme flex items-center justify-center"
                                          onClick={() => toggleActive(p)}
                                          title={p.active ? "Disattiva" : "Attiva"}
                                        >
                                          {p.active ? "❌" : "✅"}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>

                            {editing && (
                              <tr className="border-t border-theme">
                                <td colSpan={5} className="px-3 py-3">
                                  <div className="rounded-xl border border-theme bg-panel-theme p-4 space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Cognome
                                        </label>
                                        <input
                                          className={inputClass}
                                          value={editLastName}
                                          onChange={(e) => setEditLastName(e.target.value)}
                                          placeholder="Cognome"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Nome
                                        </label>
                                        <input
                                          className={inputClass}
                                          value={editFirstName}
                                          onChange={(e) => setEditFirstName(e.target.value)}
                                          placeholder="Nome"
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Data di nascita
                                        </label>
                                        <input
                                          type="date"
                                          className={inputClass}
                                          value={editBirthDate}
                                          onChange={(e) => setEditBirthDate(e.target.value)}
                                        />
                                      </div>

                                      <div>
                                        <label className="mb-1 block text-xs text-muted-theme">
                                          Numero maglia
                                        </label>
                                        <input
                                          className={inputClass}
                                          value={editShirtNumber}
                                          onChange={(e) => setEditShirtNumber(e.target.value)}
                                          placeholder="(opzionale)"
                                        />
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                      <button
                                        type="button"
                                        className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                                        onClick={() => saveEdit(p.id)}
                                      >
                                        Salva
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-md border border-theme bg-panel-theme px-4 py-2"
                                        onClick={cancelEdit}
                                      >
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Form solo staff/admin */}
        {(role === "admin" || role === "staff") && (
          <div className="card p-6 min-w-0">
          <h2 className="text-lg font-semibold text-base-theme">
            Aggiungi giocatore
          </h2>

          <form className="mt-4 space-y-3" onSubmit={addPlayer}>
            <input
              className={inputClass}
              placeholder="Nome"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Cognome"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Email giocatore"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-xs text-muted-theme">
                Data di nascita
              </label>
              <input
                type="date"
                className={inputClass}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
            <input
              className={inputClass}
              placeholder="Numero maglia (opzionale)"
              value={shirtNumber}
              onChange={(e) => setShirtNumber(e.target.value)}
            />

            <button
              className="w-full rounded-md border border-theme bg-panel-theme px-4 py-2 text-sm"
              disabled={!canSubmit}
              style={{ opacity: canSubmit ? 1 : 0.6 }}
            >
              Aggiungi
            </button>
          </form>

          <p className="mt-3 text-xs text-muted-theme">
            Disattiva un giocatore invece di eliminarlo: mantiene storico e presenze.
          </p>
        </div>
        )}
      </div>
    </div>
  );
}