'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { getDepositTx, confirmIntentDeposit, TxData } from '@/services/api';
import { parseEther } from 'viem';

export function useDepositIntent() {
    const queryClient = useQueryClient();
    const { sendTransactionAsync } = useSendTransaction();
    const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>(undefined);

    const { isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: currentTxHash,
    });

    const depositMutation = useMutation({
        mutationFn: async (intentId: string) => {
            // 1. Get TX Data from Backend
            const { tx } = await getDepositTx(intentId);

            // 2. Send Transaction via Wallet
            const hash = await sendTransactionAsync({
                to: tx.to as `0x${string}`,
                value: BigInt(tx.value),
                data: tx.data as `0x${string}`,
                gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
            });

            setCurrentTxHash(hash);

            // 3. Wait for Receipt (handled by useWaitForTransactionReceipt hook visually, but we await here for flow)
            // Note: In a real app we might want to separate these steps or rely on the hook's state. 
            // For simplicity in this mutation, we'll return the hash and let the component handle the waiting/confirmation step 
            // or we can chain it. Let's chain it for a seamless experience if possible, 
            // but waiting for receipt in mutationFn might timeout. 
            // Better approach: Return hash, let UI show "Confirming...", then call confirm API.
            // HOWEVER, to make it "one click" for the user (conceptually), we can try to wait here if the provider supports it fast enough.
            // But `sendTransactionAsync` resolves on broadcast.

            return { intentId, txHash: hash };
        },
    });

    const confirmMutation = useMutation({
        mutationFn: async ({ intentId, txHash }: { intentId: string; txHash: string }) => {
            return confirmIntentDeposit(intentId, txHash);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['intents'] });
            setCurrentTxHash(undefined);
        },
    });

    return {
        deposit: depositMutation.mutateAsync,
        confirm: confirmMutation.mutateAsync,
        isPending: depositMutation.isPending || isConfirming || confirmMutation.isPending,
        error: depositMutation.error || confirmMutation.error,
        currentTxHash,
        isConfirming,
    };
}
