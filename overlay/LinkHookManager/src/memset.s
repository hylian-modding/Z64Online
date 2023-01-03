.set noreorder
.section .text

# Very fast memset
# A0 = dest, A1 = value, A2 = length
.global memset_fast_8
memset_fast_8:
1$:
    sb      $a1, 0x0($a0)
    addi    $a2, -1
    bnez    $a2, 1$
    addi    $a0, 1
2$:
    jr      $ra
    nop