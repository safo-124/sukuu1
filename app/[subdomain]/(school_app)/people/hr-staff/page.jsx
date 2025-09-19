"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function HRStaffPage() {
  const params = useParams();
  const subdomain = params?.subdomain;
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    staffIdNumber: "",
    jobTitle: "HR Manager",
    qualification: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!subdomain) return;
      setLoading(true);
      setError(null);
      try {
        const schoolId = window.__SCHOOL_ID__ || localStorage.getItem("schoolId") || session?.user?.schoolId;
        if (!schoolId) {
          setError("School context missing");
          return;
        }
        const res = await fetch(`/api/schools/${schoolId}/people/hr-staff`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        if (!ignore) setData(json.data || []);
      } catch (e) {
        if (!ignore) setError(e.message || "Failed to load HR staff");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, [subdomain]);

  const filtered = data.filter(st => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      st.firstName?.toLowerCase().includes(q) ||
      st.lastName?.toLowerCase().includes(q) ||
      st.email?.toLowerCase().includes(q) ||
      st.staffIdNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">HR Staff</h1>
          <p className="text-sm text-muted-foreground">Manage human resources personnel</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-56"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">Add HR Staff</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New HR Staff</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const schoolId = window.__SCHOOL_ID__ || localStorage.getItem("schoolId");
                  if (!schoolId) { toast.error("Missing school context"); return; }
                  if (!form.firstName || !form.lastName || !form.email || !form.password || !form.staffIdNumber) {
                    toast.error("Please fill required fields");
                    return;
                  }
                  setSubmitting(true);
                  try {
                    const payload = { ...form };
                    if (!payload.qualification) delete payload.qualification;
                    const res = await fetch(`/api/schools/${schoolId}/people/hr-staff`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload)
                    });
                    if (!res.ok) {
                      const j = await res.json().catch(()=>({error:"Failed"}));
                      throw new Error(j.error || "Failed to create");
                    }
                    const created = await res.json();
                    toast.success("HR staff created");
                    setData(d => [created.data, ...d]);
                    setOpen(false);
                    setForm({ firstName:"", lastName:"", email:"", password:"", staffIdNumber:"", jobTitle:"HR Manager", qualification:"" });
                  } catch (err) {
                    toast.error(err.message || "Creation failed");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">First Name *</label>
                    <Input value={form.firstName} onChange={e=>setForm(f=>({...f, firstName:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Last Name *</label>
                    <Input value={form.lastName} onChange={e=>setForm(f=>({...f, lastName:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Email *</label>
                    <Input type="email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Password *</label>
                    <Input type="password" value={form.password} onChange={e=>setForm(f=>({...f, password:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Staff ID *</label>
                    <Input value={form.staffIdNumber} onChange={e=>setForm(f=>({...f, staffIdNumber:e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Job Title</label>
                    <Input value={form.jobTitle} onChange={e=>setForm(f=>({...f, jobTitle:e.target.value}))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Qualification</label>
                    <Input value={form.qualification} onChange={e=>setForm(f=>({...f, qualification:e.target.value}))} />
                  </div>
                </div>
                <DialogFooter className="pt-2 flex gap-2 justify-end">
                  <Button type="button" variant="secondary" onClick={()=>setOpen(false)} disabled={submitting}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>{submitting?"Creating...":"Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Separator />
      {loading && <p className="text-sm">Loading...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(st => (
            <Card
              key={st.id}
              className="p-4 space-y-2 cursor-pointer transition hover:shadow-sm"
              onClick={() => router.push(`/${subdomain}/people/hr-staff/${st.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{st.firstName} {st.lastName}</div>
                  <div className="text-sm text-muted-foreground break-all">{st.email}</div>
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); router.push(`/${subdomain}/people/hr-staff/${st.id}`); }}
                >View</Button>
              </div>
              <div className="text-xs text-muted-foreground">ID: {st.staffIdNumber}</div>
              <div className="text-xs">{st.jobTitle}</div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No HR staff found.</p>
          )}
        </div>
      )}
    </div>
  );
}
