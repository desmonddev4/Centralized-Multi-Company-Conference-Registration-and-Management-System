
from django.urls import path
from .views import (OfflineCollectionListView, PaymentAdminListView, PaymentInitializeView, PaymentVerifyView, PaystackWebhookView,
                    PaymentReviewListView, PaymentReviewResolveView,
                    RefundListCreateView, RefundRefreshView, SettlementListView, SettlementSyncView,
                    SettlementTransactionsView)

urlpatterns = [
    path("offline-collections/", OfflineCollectionListView.as_view(), name="offline-collections"),
    path("initialize/<str:registration_code>/", PaymentInitializeView.as_view(), name="payment-initialize"),
    path("verify/<str:reference>/", PaymentVerifyView.as_view(), name="payment-verify"),
    path("paystack/webhook/", PaystackWebhookView.as_view(), name="paystack-webhook"),
    path("reviews/", PaymentReviewListView.as_view(), name="payment-review-list"),
    path("reviews/<str:registration_code>/resolve/", PaymentReviewResolveView.as_view(), name="payment-review-resolve"),
    path("refunds/", RefundListCreateView.as_view(), name="refund-list"),
    path("refunds/<uuid:public_id>/refresh/", RefundRefreshView.as_view(), name="refund-refresh"),
    path("settlements/", SettlementListView.as_view(), name="settlement-list"),
    path("settlements/sync/", SettlementSyncView.as_view(), name="settlement-sync"),
    path("settlements/<int:paystack_id>/transactions/", SettlementTransactionsView.as_view(), name="settlement-transactions"),
    path("", PaymentAdminListView.as_view(), name="payment-list"),
]
