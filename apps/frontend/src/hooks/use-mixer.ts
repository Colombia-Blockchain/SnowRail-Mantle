'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import {
    getMixerInfo,
    generateMixerNote,
    getMixerDepositTx,
    confirmMixerDeposit,
    getMixerWithdrawTx,
    simulateMixerWithdraw,
    MixerNote
} from '@/services/api';

export function useMixer() {
    const queryClient = useQueryClient();
    const { sendTransactionAsync } = useSendTransaction();
    const [currentTxHash, setCurrentTxHash] = useState<`0x${string}` | undefined>(undefined);

    const { isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: currentTxHash,
    });

    // --- Info ---
    const infoQuery = useQuery({
        queryKey: ['mixer-info'],
        queryFn: getMixerInfo,
        refetchInterval: 10000,
    });

    // --- Deposit ---
    const generateNote = useMutation({
        mutationFn: generateMixerNote,
    });

    const depositMutation = useMutation({
        mutationFn: async (commitment: string) => {
            const { tx } = await getMixerDepositTx(commitment);
            const hash = await sendTransactionAsync({
                to: tx.to as `0x${string}`,
                value: BigInt(tx.value),
                data: tx.data as `0x${string}`,
                gas: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
            });
            setCurrentTxHash(hash);
            return { txHash: hash, commitment };
        },
    });

    const confirmDepositMutation = useMutation({
        mutationFn: async ({ txHash, commitment }: { txHash: string; commitment: string }) => {
            return confirmMixerDeposit(txHash, commitment);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mixer-info'] });
            setCurrentTxHash(undefined);
        },
    });

    // --- Withdraw ---
    const withdrawMutation = useMutation({
        mutationFn: async ({ note, recipient, leafIndex }: { note: MixerNote; recipient: string; leafIndex: number }) => {
            // 1. Simulate first to check validity and get proof (optional but good practice, though getWithdrawTx handles it on backend usually? 
            // API says simulate-withdraw returns proof. getWithdrawTx returns TX data. 
            // Let's assume getWithdrawTx acts as the "prepare" step.)

            const { tx } = await getMixerWithdrawTx(note, recipient, leafIndex);

            // Mantle often requires manual gas limit for complex ZK ops
            const gasLimit = tx.gasLimit ? BigInt(tx.gasLimit) : BigInt(350000000); // High default for ZK

            const hash = await sendTransactionAsync({
                to: tx.to as `0x${string}`,
                value: BigInt(tx.value),
                data: tx.data as `0x${string}`,
                gas: gasLimit,
            });

            return hash;
        },
        onSuccess: () => {
            // Mixer state might not update immediately for withdrawal (nullifiers), but we can refetch info
            queryClient.invalidateQueries({ queryKey: ['mixer-info'] });
        }
    });

    return {
        info: infoQuery.data,
        isLoadingInfo: infoQuery.isLoading,
        generateNote,
        deposit: depositMutation,
        confirmDeposit: confirmDepositMutation,
        withdraw: withdrawMutation,
        isConfirming,
        currentTxHash,
    };
}
