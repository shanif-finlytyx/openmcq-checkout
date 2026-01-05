"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      window.location.href = "mcqsolver://payment-failure?reason=no_token";
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(atob(token.split(".")[1]));
    } catch (err) {
      window.location.href = "mcqsolver://payment-failure?reason=invalid_token";
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => {
      if (payload.finalAmount === 0) {
        verifyPayment(null, payload);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_RJve4oor7MGl8k",
        amount: payload.finalAmount * 100,
        currency: "INR",
        name: "OpenMCQ",
        description: "Premium Subscription",
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
            window.location.href = "mcqsolver://payment-failure?reason=cancelled";
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };

    script.onerror = () => {
      window.location.href = "mcqsolver://payment-failure?reason=network_error";
    };

    document.body.appendChild(script);
  }, [token]);

  const verifyPayment = async (razorpayResponse: any, payload: any) => {
    const body = {
      courseId: payload.courseId,
      orderId: payload.orderId,
      paymentId: razorpayResponse?.razorpay_payment_id || null,
      planId: payload.planId,
      preferredSubjects: payload.preferredSubjects,
      signature: razorpayResponse?.razorpay_signature || null,
      studentId: payload.studentId,
      token: token,
    };

    try {
      const res = await fetch("https://productionapi.openmcq.com/api/subscription/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      // THIS IS WHAT YOU WANTED — USE deepLink FROM BACKEND
      if (result.deepLink) {
        window.location.href = result.deepLink;
      } else if (result.success) {
        window.location.href = `mcqsolver://payment-success?orderId=${payload.orderId}&status=success`;
      } else {
        window.location.href = `mcqsolver://payment-failure?reason=${result.message || "failed"}`;
      }
    } catch (err) {
      window.location.href = "mcqsolver://payment-failure?reason=network_error";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 mx-auto mb-8"></div>
        <h1 className="text-3xl font-bold text-purple-800">Opening Secure Payment...</h1>
        <p className="mt-4 text-gray-600">Please wait • Do not close this page</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 mx-auto mb-8"></div>
          <h1 className="text-3xl font-bold text-purple-800">Loading...</h1>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
