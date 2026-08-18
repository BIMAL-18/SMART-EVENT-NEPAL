import React from 'react';

export default function About() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 py-10">
      <h1 className="text-3xl font-bold">About SmartEvent Nepal</h1>
      <p className="text-slate-400 leading-relaxed">
        SmartEvent Nepal is an academic demonstration of an AI-driven event management and
        recommendation platform, built for a CSIT/Computer Engineering final-year project. It combines
        a real hybrid recommendation engine, a from-scratch Random Forest attendance predictor, QR-based
        ticketing and check-in, and role-based dashboards for attendees, organizers, and administrators.
      </p>
      <p className="text-slate-400 leading-relaxed">
        Payment integrations for eSewa and Khalti are scaffolded with a working demo payment provider so
        the app runs fully offline without real merchant credentials — see the README for details.
      </p>
    </div>
  );
}
