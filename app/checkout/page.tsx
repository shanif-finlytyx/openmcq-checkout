"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-2xl font-medium text-purple-700">Loading checkout...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
    
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      alert("No token found!");
      setLoading(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      console.log("Decoded JWT:", payload);
      setData(payload);
      setLoading(false);

      setTimeout(() => {
        openRazorpay(payload);
      }, 3000);
    } catch (err) {
      alert("Invalid or expired token");
      setLoading(false);
    }
  }, [token]);

  const openRazorpay = (payload: any) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => {
      if (payload.finalAmount === 0) {
        verifyPayment(null, payload);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: payload.finalAmount * 100,
        currency: "INR",
        name: "OpenMCQ",
        description: "Premium Plan",
        order_id: payload.orderId,
        handler: (response: any) => {
          verifyPayment(response, payload);
        },
        prefill: {
          name: "Student",
          email: "student@openmcq.com",
          contact: "9999999999",
        },
        theme: { color: "#8b5cf6" },
        modal: {
          ondismiss: () => {
            window.location.href = "openmcq://payment-cancelled";
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };

    document.body.appendChild(script);
  };

  const verifyPayment = async (razorpayResponse: any, payload: any) => {
    const body = {
      courseId: payload.courseId,
      orderId: payload.orderId,
      paymentId: razorpayResponse?.razorpay_payment_id || null,
      planId: payload.planId,
      preferredSubjects: payload.preferredSubjects,
      signature: razorpayResponse?.razorpay_signature || null,
      studentId: payload.studentId,
    };

    try {
      const res = await fetch("http://localhost:5000/api/subscription/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (result.success) {
        window.location.href = "openmcq://payment-success";
      } else {
        alert("Verification failed: " + result.message);
        window.location.href = "openmcq://payment-failed";
      }
    } catch (err) {
      alert("Network error");
      window.location.href = "openmcq://payment-failed";
    }
  };

  // Only ONE loading block
  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <p className="text-2xl font-medium text-purple-700">Loading secure payment...</p>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-linear-to-br from-purple-100 to-indigo-100 flex text-black items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-3xl w-full">
        <h1 className="text-5xl font-bold text-center text-purple-700 mb-10">
          Payment Details (Testing)
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-lg">
          <InfoBox label="Student ID" value={data.studentId} />
          <InfoBox label="Plan ID" value={data.planId} />
          <InfoBox label="Course ID" value={data.courseId} />
          <InfoBox label="Order ID" value={data.orderId} highlight />
          <InfoBox label="Amount" value={`₹${data.finalAmount}`} big green />

          <div className="md:col-span-2">
            <strong className="text-gray-700">Preferred Subjects:</strong>
            <div className="mt-3 flex flex-wrap gap-3">
              {data?.preferredSubjects && data.preferredSubjects.length > 0 ? (
                data.preferredSubjects.map((sub: string) => (
                  <span key={sub} className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-full font-medium">
                    {sub}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 italic">No subjects selected</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-2xl font-semibold text-gray-800">
            {data.finalAmount === 0
              ? "Free Plan → Activating..."
              : "Razorpay opening in 3 sec..."}
          </p>
          <div className="mt-6 text-6xl animate-bounce">Down Arrow</div>
        </div>
      </div>
    </div>
  );
}

// Reusable component - OUTSIDE the main function
function InfoBox({ label, value, big = false, green = false, highlight = false }: {
  label: string;
  value: string;
  big?: boolean;
  green?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`p-5 rounded-xl ${green ? "bg-green-50 border-4 border-green-400" : "bg-gray-50"}`}>
      <p className="text-gray-600 font-medium">{label}</p>
      <p className={`font-mono break-all ${big ? "text-4xl font-bold" : "text-lg"} ${highlight ? "text-blue-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}