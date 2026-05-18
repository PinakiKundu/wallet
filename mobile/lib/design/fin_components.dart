import 'package:flutter/material.dart';

import 'finbrand.dart';

class FinScaffold extends StatelessWidget {
  const FinScaffold(
      {required this.child,
      this.padding = const EdgeInsets.fromLTRB(20, 16, 20, 24),
      super.key});

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    return Container(
        decoration:
            BoxDecoration(gradient: FinBrand.backgroundGradient(brightness)),
        child: SafeArea(
            bottom: false, child: Padding(padding: padding, child: child)));
  }
}

class FinCard extends StatelessWidget {
  const FinCard(
      {required this.child,
      this.padding = const EdgeInsets.all(18),
      this.gradient,
      this.onTap,
      super.key});

  final Widget child;
  final EdgeInsets padding;
  final Gradient? gradient;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final content = AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: padding,
        decoration: BoxDecoration(
            color: gradient == null
                ? (isDark
                    ? Colors.white.withValues(alpha: 0.07)
                    : Colors.white.withValues(alpha: 0.88))
                : null,
            gradient: gradient,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.08)
                    : Colors.white.withValues(alpha: 0.72)),
            boxShadow: [
              BoxShadow(
                  color: (isDark ? Colors.black : FinBrand.primary)
                      .withValues(alpha: isDark ? 0.18 : 0.08),
                  blurRadius: 28,
                  offset: const Offset(0, 14))
            ]),
        child: child);
    if (onTap == null) {
      return content;
    }
    return InkWell(
        borderRadius: BorderRadius.circular(8), onTap: onTap, child: content);
  }
}

class FinButton extends StatelessWidget {
  const FinButton(
      {required this.label,
      required this.onPressed,
      this.icon,
      this.secondary = false,
      this.loading = false,
      super.key});

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool secondary;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final child = AnimatedSwitcher(
        duration: const Duration(milliseconds: 180),
        child: loading
            ? const SizedBox(
                key: ValueKey('loading'),
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white))
            : Row(
                key: const ValueKey('label'),
                mainAxisSize: MainAxisSize.min,
                children: [
                    if (icon != null) ...[
                      Icon(icon, size: 19),
                      const SizedBox(width: 8)
                    ],
                    Flexible(
                        child: Text(label, overflow: TextOverflow.ellipsis))
                  ]));
    final style = secondary
        ? OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(54),
            foregroundColor: Theme.of(context).colorScheme.primary,
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            side: BorderSide(
                color: Theme.of(context)
                    .colorScheme
                    .primary
                    .withValues(alpha: 0.28)))
        : FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(54),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            backgroundColor: FinBrand.primary,
            foregroundColor: Colors.white);
    return secondary
        ? OutlinedButton(
            onPressed: loading ? null : onPressed, style: style, child: child)
        : FilledButton(
            onPressed: loading ? null : onPressed, style: style, child: child);
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({required this.title, this.action, super.key});

  final String title;
  final String? action;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleMedium)),
      if (action != null)
        Text(action!,
            style: const TextStyle(
                color: FinBrand.primary, fontWeight: FontWeight.w800))
    ]);
  }
}

class QuickActionTile extends StatelessWidget {
  const QuickActionTile(
      {required this.icon, required this.label, this.onTap, super.key});

  final IconData icon;
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final textColor = FinBrand.textColor(Theme.of(context).brightness);

    return FinCard(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        onTap: onTap,
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                  color: FinBrand.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: FinBrand.primary, size: 20)),
          const SizedBox(height: 7),
          Text(label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                  color: textColor, fontWeight: FontWeight.w800, fontSize: 11))
        ]));
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill(
      {required this.label, this.color = FinBrand.success, super.key});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(999)),
        child: Text(label,
            style: TextStyle(
                color: color, fontSize: 12, fontWeight: FontWeight.w900)));
  }
}

class EmptyStateGraphic extends StatelessWidget {
  const EmptyStateGraphic(
      {required this.title,
      required this.subtitle,
      this.icon = Icons.auto_awesome,
      super.key});

  final String title;
  final String subtitle;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final subtitleColor = isDark ? Colors.white70 : FinBrand.muted;

    return FinCard(
        child: Column(children: [
      Container(
          width: 72,
          height: 72,
          decoration: BoxDecoration(
              gradient: FinBrand.gradient,
              borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: Colors.white, size: 34)),
      const SizedBox(height: 14),
      Text(title,
          style: Theme.of(context).textTheme.titleMedium,
          textAlign: TextAlign.center),
      const SizedBox(height: 6),
      Text(subtitle,
          style: TextStyle(color: subtitleColor), textAlign: TextAlign.center)
    ]));
  }
}

class AnimatedCheckmark extends StatefulWidget {
  const AnimatedCheckmark({this.success = true, super.key});

  final bool success;

  @override
  State<AnimatedCheckmark> createState() => _AnimatedCheckmarkState();
}

class _AnimatedCheckmarkState extends State<AnimatedCheckmark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 720))
      ..forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.success ? FinBrand.success : FinBrand.error;
    return ScaleTransition(
        scale: CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
        child: Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12), shape: BoxShape.circle),
            child: Icon(
                widget.success ? Icons.check_rounded : Icons.close_rounded,
                color: color,
                size: 42)));
  }
}

class SkeletonLine extends StatefulWidget {
  const SkeletonLine({this.height = 16, this.width, super.key});

  final double height;
  final double? width;

  @override
  State<SkeletonLine> createState() => _SkeletonLineState();
}

class _SkeletonLineState extends State<SkeletonLine>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1100))
      ..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FadeTransition(
        opacity: Tween<double>(begin: 0.35, end: 0.8).animate(_controller),
        child: Container(
            width: widget.width,
            height: widget.height,
            decoration: BoxDecoration(
                color: (isDark ? Colors.white : FinBrand.cloud)
                    .withValues(alpha: isDark ? 0.18 : 0.8),
                borderRadius: BorderRadius.circular(999))));
  }
}
